from __future__ import annotations

import argparse
import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
import zipfile
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Target:
    name: str
    goos: str
    goarch: str
    wheel_tag: str
    binary_name: str
    binary_magic: bytes


TARGETS = {
    "windows-amd64": Target(
        "windows-amd64", "windows", "amd64", "win_amd64", "lumenvec.exe", b"MZ"
    ),
    "linux-amd64": Target(
        "linux-amd64",
        "linux",
        "amd64",
        "manylinux_2_17_x86_64",
        "lumenvec",
        b"\x7fELF",
    ),
    "linux-arm64": Target(
        "linux-arm64",
        "linux",
        "arm64",
        "manylinux_2_17_aarch64",
        "lumenvec",
        b"\x7fELF",
    ),
    "macos-amd64": Target(
        "macos-amd64",
        "darwin",
        "amd64",
        "macosx_11_0_x86_64",
        "lumenvec",
        b"\xcf\xfa\xed\xfe",
    ),
    "macos-arm64": Target(
        "macos-arm64",
        "darwin",
        "arm64",
        "macosx_11_0_arm64",
        "lumenvec",
        b"\xcf\xfa\xed\xfe",
    ),
}


def run(command: list[str], cwd: Path, env: dict[str, str] | None = None) -> None:
    executable = shutil.which(command[0], path=(env or os.environ).get("PATH"))
    if executable is None:
        raise RuntimeError(f"Required build command was not found: {command[0]}")
    subprocess.run([executable, *command[1:]], cwd=cwd, env=env, check=True)


def current_target() -> str:
    machine = platform.machine().lower()
    architecture = "arm64" if machine in {"arm64", "aarch64"} else "amd64"
    if sys.platform == "win32":
        return f"windows-{architecture}"
    if sys.platform == "darwin":
        return f"macos-{architecture}"
    return f"linux-{architecture}"


def build_lumenvec(source: Path, output: Path, target: Target) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    environment = os.environ.copy()
    environment.update(
        {"CGO_ENABLED": "0", "GOOS": target.goos, "GOARCH": target.goarch}
    )
    run(
        ["go", "build", "-trimpath", "-o", str(output), "./cmd/server"],
        source,
        environment,
    )


def validate_wheel(wheel: Path, target: Target) -> dict[str, object]:
    with zipfile.ZipFile(wheel) as archive:
        names = set(archive.namelist())
        manifest_suffix = "lumenrag/assets/manifest.json"
        manifest_names = sorted(
            name for name in names if name.endswith(manifest_suffix)
        )
        if len(manifest_names) != 1:
            raise RuntimeError(f"Wheel is missing packaged assets: {wheel}")
        manifest_name = manifest_names[0]
        asset_prefix = manifest_name[: -len("manifest.json")]
        binary_name = f"{asset_prefix}bin/{target.binary_name}"
        if binary_name not in names:
            raise RuntimeError(f"Wheel is missing LumenVec binary: {wheel}")
        binary_content = archive.read(binary_name)
        if not binary_content.startswith(target.binary_magic):
            raise RuntimeError(f"Wheel contains an invalid LumenVec binary: {wheel}")
        manifest = json.loads(archive.read(manifest_name))
        if manifest["target_platform"] != target.name:
            raise RuntimeError("Wheel target does not match its manifest")
        for relative, expected in manifest["files"].items():
            content = archive.read(f"{asset_prefix}{relative}")
            if hashlib.sha256(content).hexdigest() != expected:
                raise RuntimeError(f"Wheel asset hash mismatch: {relative}")
    return {
        "wheel": str(wheel),
        "target": target.name,
        "bytes": wheel.stat().st_size,
        "sha256": hashlib.sha256(wheel.read_bytes()).hexdigest(),
        "binary_magic": binary_content[:4].hex(),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build self-contained LumenRAG wheels")
    parser.add_argument(
        "--target", action="append", choices=sorted(TARGETS), help="Target platform"
    )
    parser.add_argument("--all", action="store_true", help="Build every platform")
    parser.add_argument("--lumenvec-root", type=Path)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(__file__).resolve().parent
    backend = root / "backend"
    frontend = root / "frontend"
    lumenvec = (
        args.lumenvec_root.resolve()
        if args.lumenvec_root
        else root.parents[1] / "lumenvec"
    )
    if not (lumenvec / "go.mod").is_file():
        raise RuntimeError(f"LumenVec source repository not found: {lumenvec}")

    selected = list(TARGETS) if args.all else (args.target or [current_target()])
    build_root = root / ".build" / "wheels"
    output_root = root / "dist" / "wheels"
    output_root.mkdir(parents=True, exist_ok=True)

    run(["npm", "run", "build"], frontend)
    receipts = []
    for name in selected:
        target = TARGETS[name]
        target_root = build_root / target.name
        binary = target_root / target.binary_name
        build_lumenvec(lumenvec, binary, target)
        shutil.rmtree(backend / "build", ignore_errors=True)
        environment = os.environ.copy()
        environment.update(
            {
                "LUMENRAG_TARGET_PLATFORM": target.name,
                "LUMENRAG_WHEEL_TAG": target.wheel_tag,
                "LUMENRAG_BINARY_NAME": target.binary_name,
                "LUMENRAG_LUMENVEC_BINARY": str(binary),
                "LUMENRAG_STUDIO_DIST": str(frontend / "dist"),
            }
        )
        before = set(output_root.glob("*.whl"))
        run(
            [
                sys.executable,
                "-m",
                "build",
                "--wheel",
                "--outdir",
                str(output_root),
            ],
            backend,
            environment,
        )
        created = set(output_root.glob("*.whl")) - before
        matching = sorted(created or output_root.glob(f"*{target.wheel_tag}.whl"))
        if len(matching) != 1:
            raise RuntimeError(f"Could not identify wheel for {target.name}")
        receipts.append(validate_wheel(matching[0], target))

    receipt_path = output_root / "build-receipt.json"
    receipt_path.write_text(
        json.dumps({"schema_version": 1, "artifacts": receipts}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(receipt_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
