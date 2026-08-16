from __future__ import annotations

import hashlib
import json
import os
import stat
from functools import lru_cache
from importlib import resources
from pathlib import Path
from typing import Any


class BundledAssetError(RuntimeError):
    """Raised when packaged product assets fail integrity validation."""


def _assets_root() -> Path | None:
    candidate = resources.files("lumenrag").joinpath("assets")
    try:
        path = Path(os.fspath(candidate))
    except TypeError:
        return None
    return path if path.is_dir() else None


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


@lru_cache(maxsize=1)
def verified_manifest() -> tuple[Path, dict[str, Any]] | None:
    assets = _assets_root()
    if assets is None:
        return None
    manifest_path = assets / "manifest.json"
    if not manifest_path.is_file():
        raise BundledAssetError("Packaged asset manifest is missing.")
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise BundledAssetError("Packaged asset manifest is invalid.") from exc
    if manifest.get("schema_version") != 1:
        raise BundledAssetError("Unsupported packaged asset manifest.")
    files = manifest.get("files")
    if not isinstance(files, dict) or not files:
        raise BundledAssetError("Packaged asset manifest contains no files.")
    for relative, expected in files.items():
        if not isinstance(relative, str) or not isinstance(expected, str):
            raise BundledAssetError("Packaged asset manifest has invalid entries.")
        path = (assets / relative).resolve()
        if assets.resolve() not in path.parents or not path.is_file():
            raise BundledAssetError(f"Packaged asset is missing: {relative}")
        if _sha256(path) != expected:
            raise BundledAssetError(f"Packaged asset integrity failed: {relative}")
    return assets, manifest


def bundled_binary() -> Path | None:
    verified = verified_manifest()
    if verified is None:
        return None
    assets, manifest = verified
    binary = assets / str(manifest["binary"])
    if os.name != "nt":
        binary.chmod(
            binary.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH
        )
    return binary


def bundled_studio() -> Path | None:
    verified = verified_manifest()
    if verified is None:
        return None
    assets, manifest = verified
    return assets / Path(str(manifest["studio"])).parent
