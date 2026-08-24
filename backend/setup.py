from __future__ import annotations

import hashlib
import json
import os
import shutil
from pathlib import Path

from setuptools import setup
from setuptools.command.bdist_wheel import bdist_wheel as bdist_wheel_base
from setuptools.command.build_py import build_py as build_py_base


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class LumenRAGBuildPy(build_py_base):
    def run(self) -> None:
        super().run()
        target = os.getenv("LUMENRAG_TARGET_PLATFORM", "").strip()
        if not target:
            return

        studio_source = Path(os.environ["LUMENRAG_STUDIO_DIST"]).resolve()
        binary_source = Path(os.environ["LUMENRAG_LUMENVEC_BINARY"]).resolve()
        binary_name = os.getenv("LUMENRAG_BINARY_NAME", binary_source.name)
        if not (studio_source / "index.html").is_file():
            raise RuntimeError(f"Studio build is missing: {studio_source}")
        if not binary_source.is_file():
            raise RuntimeError(f"LumenVec binary is missing: {binary_source}")

        assets = Path(self.build_lib) / "lumenrag" / "assets"
        studio_target = assets / "studio"
        binary_target = assets / "bin" / binary_name
        shutil.rmtree(assets, ignore_errors=True)
        shutil.copytree(studio_source, studio_target)
        binary_target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(binary_source, binary_target)
        if os.name != "nt":
            binary_target.chmod(0o755)

        files: dict[str, str] = {}
        for asset in sorted(path for path in assets.rglob("*") if path.is_file()):
            files[asset.relative_to(assets).as_posix()] = sha256(asset)
        manifest = {
            "schema_version": 1,
            "product_version": "0.1.5",
            "target_platform": target,
            "binary": f"bin/{binary_name}",
            "studio": "studio/index.html",
            "files": files,
        }
        (assets / "manifest.json").write_text(
            json.dumps(manifest, indent=2, sort_keys=True) + "\n",
            encoding="utf-8",
        )


class LumenRAGWheel(bdist_wheel_base):
    def finalize_options(self) -> None:
        super().finalize_options()
        self.root_is_pure = False

    def get_tag(self) -> tuple[str, str, str]:
        platform_tag = os.getenv("LUMENRAG_WHEEL_TAG", "").strip()
        if not platform_tag:
            return super().get_tag()
        return "py3", "none", platform_tag


setup(cmdclass={"build_py": LumenRAGBuildPy, "bdist_wheel": LumenRAGWheel})
