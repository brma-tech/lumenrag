from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pytest

from lumenrag.bundled import BundledAssetError, bundled_binary, verified_manifest


def create_assets(root: Path) -> Path:
    assets = root / "assets"
    binary = assets / "bin" / "lumenvec.exe"
    studio = assets / "studio" / "index.html"
    binary.parent.mkdir(parents=True)
    studio.parent.mkdir(parents=True)
    binary.write_bytes(b"lumenvec-binary")
    studio.write_text("<title>LumenRAG</title>", encoding="utf-8")
    files = {
        "bin/lumenvec.exe": hashlib.sha256(binary.read_bytes()).hexdigest(),
        "studio/index.html": hashlib.sha256(studio.read_bytes()).hexdigest(),
    }
    (assets / "manifest.json").write_text(
        json.dumps(
            {
                "schema_version": 1,
                "binary": "bin/lumenvec.exe",
                "studio": "studio/index.html",
                "files": files,
            }
        ),
        encoding="utf-8",
    )
    return assets


def test_bundled_assets_are_verified(monkeypatch, tmp_path: Path) -> None:
    assets = create_assets(tmp_path)
    monkeypatch.setattr("lumenrag.bundled._assets_root", lambda: assets)
    verified_manifest.cache_clear()

    assert bundled_binary() == assets / "bin" / "lumenvec.exe"

    verified_manifest.cache_clear()


def test_bundled_asset_tampering_is_rejected(monkeypatch, tmp_path: Path) -> None:
    assets = create_assets(tmp_path)
    (assets / "bin" / "lumenvec.exe").write_bytes(b"tampered")
    monkeypatch.setattr("lumenrag.bundled._assets_root", lambda: assets)
    verified_manifest.cache_clear()

    with pytest.raises(BundledAssetError, match="integrity failed"):
        bundled_binary()

    verified_manifest.cache_clear()
