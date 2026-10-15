from __future__ import annotations

import json
import os
from collections.abc import Iterator
from typing import Any
from urllib import error, request
from urllib.parse import urlencode

from rag_lumenvec.core.config import DEFAULT_BASE_URL
from rag_lumenvec.models import APIError
from rag_lumenvec.services.network import validate_outbound_url


class LumenVecClient:
    """Small REST client that supports both the old and collection-aware APIs."""

    def __init__(
        self,
        base_url: str = DEFAULT_BASE_URL,
        api_key: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        self.base_url = validate_outbound_url(base_url)
        self.api_key = api_key or os.getenv("LUMENVEC_API_KEY")
        self.timeout = timeout

    def health(self) -> str:
        body = self._request("GET", "/health")
        text = body.decode("utf-8", "ignore")
        try:
            payload = json.loads(text)
            return payload.get("status") or payload.get("health") or text
        except json.JSONDecodeError:
            return text

    def ensure_collection(self, collection: str, dimensions: int | None = None) -> None:
        payload: dict[str, Any] = {"name": collection}
        if dimensions:
            payload["dimensions"] = dimensions
            payload["dimension"] = dimensions

        candidates = [
            ("POST", "/collections", payload),
            ("PUT", f"/collections/{collection}", payload),
            ("POST", "/vectors/collections", payload),
        ]
        for method, path, body in candidates:
            try:
                self._request(
                    method, path, body, expected_statuses={200, 201, 202, 204, 409}
                )
                return
            except APIError:
                continue

    def add_vectors(
        self,
        collection: str,
        vectors: list[dict[str, Any]],
        dimensions: int | None = None,
    ) -> None:
        self.ensure_collection(collection, dimensions)
        candidates = [
            ("POST", f"/collections/{collection}/vectors/batch", {"vectors": vectors}),
            ("POST", f"/collections/{collection}/points/batch", {"vectors": vectors}),
            ("POST", f"/vectors/collections/{collection}/batch", {"vectors": vectors}),
            ("POST", "/vectors/batch", {"vectors": vectors}),
        ]
        self._first_success(candidates, expected_statuses={200, 201, 202, 204})

    def search(
        self, collection: str, values: list[float], k: int
    ) -> list[dict[str, Any]]:
        candidates = [
            ("POST", f"/collections/{collection}/search", {"values": values, "k": k}),
            (
                "POST",
                f"/collections/{collection}/vectors/search",
                {"values": values, "k": k},
            ),
            (
                "POST",
                f"/vectors/collections/{collection}/search",
                {"values": values, "k": k},
            ),
            ("POST", "/vectors/search", {"values": values, "k": k}),
        ]
        body = self._first_success(candidates)
        return normalize_search_results(json.loads(body.decode("utf-8")))

    def list_vectors(self, limit: int = 80) -> list[dict[str, Any]]:
        items, _ = self._list_vectors_page(limit)
        return items

    def iter_vectors(
        self,
        limit: int = 80,
        *,
        after: str | None = None,
        stop_after_prefix: str | None = None,
    ) -> Iterator[dict[str, Any]]:
        page_limit = max(1, min(limit, 200))
        cursor: str | None = None
        seen_cursors: set[str] = set()
        first_page = True

        while True:
            params = {"limit": page_limit}
            if cursor:
                params["cursor"] = cursor
            elif first_page and after:
                params["after"] = after
            body = self._request("GET", f"/vectors?{urlencode(params)}")
            payload = json.loads(body.decode("utf-8"))
            legacy_response = isinstance(payload, list)

            # Older LumenVec APIs return a bare vector list and do not expose a
            # continuation cursor. If they ignore `after`, retry from the start
            # so the caller can still find its IDs in the legacy response.
            if isinstance(payload, list) and first_page and after:
                body = self._request(
                    "GET", f"/vectors?{urlencode({'limit': page_limit})}"
                )
                payload = json.loads(body.decode("utf-8"))
                legacy_response = isinstance(payload, list)

            items, next_cursor = self._parse_vector_page(payload)
            for item in items:
                if (
                    stop_after_prefix
                    and not legacy_response
                    and not item["id"].startswith(stop_after_prefix)
                ):
                    return
                yield item

            if not next_cursor:
                return
            if next_cursor in seen_cursors:
                raise APIError("LumenVec returned a repeated vector-list cursor")
            seen_cursors.add(next_cursor)
            cursor = next_cursor
            first_page = False

    def _list_vectors_page(
        self, limit: int, *, cursor: str | None = None, after: str | None = None
    ) -> tuple[list[dict[str, Any]], str | None]:
        params = {"limit": max(1, min(limit, 200))}
        if cursor:
            params["cursor"] = cursor
        elif after:
            params["after"] = after
        body = self._request("GET", f"/vectors?{urlencode(params)}")
        payload = json.loads(body.decode("utf-8"))
        items, next_cursor = self._parse_vector_page(payload)
        return items, next_cursor

    @staticmethod
    def _parse_vector_page(payload: Any) -> tuple[list[dict[str, Any]], str | None]:
        if isinstance(payload, dict):
            items = payload.get("vectors", [])
            next_cursor = payload.get("next_cursor")
        else:
            items = payload
            next_cursor = None
        if not isinstance(items, list):
            return [], None
        vectors = [
            {
                "id": str(item["id"]),
                "values": [float(value) for value in item["values"]],
            }
            for item in items
            if isinstance(item, dict)
            and item.get("id")
            and isinstance(item.get("values"), list)
        ]
        return vectors, str(next_cursor) if next_cursor else None

    def delete_vector(self, collection: str, vector_id: str) -> None:
        safe_id = quote_path(vector_id)
        candidates = [
            ("DELETE", f"/collections/{collection}/vectors/{safe_id}", None),
            ("DELETE", f"/collections/{collection}/points/{safe_id}", None),
            ("DELETE", f"/vectors/collections/{collection}/{safe_id}", None),
            ("DELETE", f"/vectors/{safe_id}", None),
        ]
        self._first_success(candidates, expected_statuses={200, 202, 204, 404})

    def _first_success(
        self,
        candidates: list[tuple[str, str, dict[str, Any] | None]],
        expected_statuses: set[int] | None = None,
    ) -> bytes:
        errors: list[str] = []
        for method, path, payload in candidates:
            try:
                return self._request(
                    method, path, payload, expected_statuses=expected_statuses
                )
            except APIError as exc:
                errors.append(str(exc))
        raise APIError("; ".join(errors))

    def _request(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None = None,
        expected_statuses: set[int] | None = None,
    ) -> bytes:
        statuses = expected_statuses or {200}
        data = None if payload is None else json.dumps(payload).encode("utf-8")
        req = request.Request(
            url=f"{self.base_url}{path}",
            data=data,
            method=method,
            headers={"Content-Type": "application/json"},
        )
        if self.api_key:
            req.add_header("X-API-Key", self.api_key)
        try:
            with request.urlopen(req, timeout=self.timeout) as response:
                body = response.read()
                if response.status not in statuses:
                    detail = body.decode("utf-8", "ignore")
                    raise APIError(
                        f"{method} {path} returned {response.status}: {detail}"
                    )
                return body
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "ignore")
            raise APIError(f"{method} {path} returned {exc.code}: {detail}") from exc
        except error.URLError as exc:
            raise APIError(
                f"failed to reach LumenVec at {self.base_url}: {exc.reason}"
            ) from exc
        except (
            ConnectionResetError,
            ConnectionAbortedError,
            BrokenPipeError,
            OSError,
        ) as exc:
            # Windows reports a peer-closed socket as WinError 10054. Keep the
            # endpoint in the error so the API response identifies which hop
            # failed instead of exposing an opaque generic 400.
            raise APIError(
                f"LumenVec connection failed at {self.base_url}: {exc}"
            ) from exc


def quote_path(value: str) -> str:
    from urllib.parse import quote

    return quote(value, safe="")


def normalize_search_results(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict):
        for key in ("results", "matches", "data", "points"):
            if isinstance(payload.get(key), list):
                payload = payload[key]
                break
    if not isinstance(payload, list):
        return []

    normalized: list[dict[str, Any]] = []
    for item in payload:
        if not isinstance(item, dict):
            continue
        vector_id = item.get("id") or item.get("vector_id") or item.get("point_id")
        if not vector_id:
            continue
        distance = item.get("distance")
        if distance is None:
            score = item.get("score", item.get("similarity", 0.0))
            distance = max(0.0, 1.0 - float(score))
        normalized.append({"id": str(vector_id), "distance": float(distance)})
    return normalized
