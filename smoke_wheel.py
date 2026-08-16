from __future__ import annotations

import argparse
import json
import os
import shutil
import signal
import socket
import subprocess
import time
import urllib.error
import urllib.request
import venv
from pathlib import Path


def free_port() -> int:
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        return int(listener.getsockname()[1])


def wait_for(url: str, *, contains: bytes | None = None, timeout: float = 35) -> bool:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        try:
            with urllib.request.urlopen(url, timeout=0.5) as response:
                content = response.read()
                if 200 <= response.status < 300 and (
                    contains is None or contains in content
                ):
                    return True
        except (OSError, urllib.error.URLError):
            pass
        time.sleep(0.2)
    return False


def venv_executable(environment: Path, name: str) -> Path:
    scripts = environment / ("Scripts" if os.name == "nt" else "bin")
    suffix = ".exe" if os.name == "nt" else ""
    return scripts / f"{name}{suffix}"


def stop_process(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is not None:
        return
    if os.name == "nt":
        process.send_signal(signal.CTRL_BREAK_EVENT)
    else:
        os.killpg(process.pid, signal.SIGINT)
    try:
        process.wait(timeout=20)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait(timeout=5)


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke test an installed LumenRAG wheel")
    parser.add_argument("wheel", type=Path)
    parser.add_argument("--root", type=Path)
    args = parser.parse_args()

    wheel = args.wheel.resolve()
    if not wheel.is_file():
        raise RuntimeError(f"Wheel does not exist: {wheel}")
    project = Path(__file__).resolve().parent
    root = (args.root or project / ".build" / "wheel-smoke").resolve()
    if root == project or project not in root.parents:
        raise RuntimeError("Smoke root must stay inside the project directory")
    shutil.rmtree(root, ignore_errors=True)
    root.mkdir(parents=True)
    environment = root / "venv"
    venv.EnvBuilder(with_pip=True, clear=True).create(environment)
    python = venv_executable(environment, "python")
    cli = venv_executable(environment, "lumenrag")
    subprocess.run(
        [str(python), "-m", "pip", "install", "--disable-pip-version-check", str(wheel)],
        check=True,
    )
    version = subprocess.check_output([str(cli), "--version"], text=True).strip()

    studio_port = free_port()
    lumenvec_port = free_port()
    output_path = root / "launcher.log"
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    with output_path.open("wb") as output:
        process = subprocess.Popen(
            [
                str(cli),
                "start",
                "--no-browser",
                "--port",
                str(studio_port),
                "--lumenvec-url",
                f"http://127.0.0.1:{lumenvec_port}",
                "--workspace",
                str(root / "workspace"),
            ],
            stdout=output,
            stderr=subprocess.STDOUT,
            creationflags=creationflags,
            start_new_session=os.name != "nt",
        )
    try:
        database_ready = wait_for(f"http://127.0.0.1:{lumenvec_port}/health")
        studio_ready = wait_for(
            f"http://127.0.0.1:{studio_port}/", contains=b"LumenRAG Studio"
        )
        if not database_ready or not studio_ready:
            raise RuntimeError(
                f"Installed wheel failed startup: database={database_ready}, "
                f"studio={studio_ready}, exit={process.poll()}"
            )
    finally:
        stop_process(process)

    if process.returncode != 0:
        raise RuntimeError(f"Launcher exited with code {process.returncode}")
    if wait_for(f"http://127.0.0.1:{lumenvec_port}/health", timeout=1):
        raise RuntimeError("Managed LumenVec remained available after shutdown")

    receipt = {
        "schema_version": 1,
        "wheel": str(wheel),
        "version": version,
        "database_ready": database_ready,
        "studio_ready": studio_ready,
        "launcher_exit_code": process.returncode,
        "studio_port": studio_port,
        "lumenvec_port": lumenvec_port,
        "log": str(output_path),
    }
    receipt_path = root / "receipt.json"
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    print(receipt_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
