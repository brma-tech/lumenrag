from __future__ import annotations

import os
import shutil
import signal
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from collections.abc import Callable
from contextlib import nullcontext
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol
from urllib.parse import urlparse

from lumenrag.bundled import BundledAssetError, bundled_binary, bundled_studio


class LauncherError(RuntimeError):
    """Raised when the local product stack cannot be started safely."""


class Process(Protocol):
    def poll(self) -> int | None: ...

    def wait(self, timeout: float | None = None) -> int: ...

    def terminate(self) -> None: ...

    def kill(self) -> None: ...

    def send_signal(self, sig: int) -> None: ...


@dataclass(frozen=True)
class StartOptions:
    host: str = "127.0.0.1"
    port: int = 8000
    workspace: Path = Path(".lumenrag")
    lumenvec_url: str = "http://127.0.0.1:19190"
    lumenvec_binary: Path | None = None
    external_lumenvec: bool = False
    open_browser: bool = True
    startup_timeout: float = 20.0


@dataclass
class ManagedProcess:
    process: Process
    use_process_group: bool = False

    def stop(self, timeout: float = 5.0) -> None:
        if self.process.poll() is not None:
            return
        try:
            if self.use_process_group and os.name == "nt":
                self.process.send_signal(signal.CTRL_BREAK_EVENT)
            else:
                self.process.terminate()
            self.process.wait(timeout=timeout)
        except (OSError, subprocess.TimeoutExpired):
            self.process.kill()
            self.process.wait(timeout=timeout)


def default_workspace() -> Path:
    override = os.getenv("LUMENRAG_HOME")
    if override:
        return Path(override).expanduser()
    if os.name == "nt":
        base = Path(os.getenv("LOCALAPPDATA", Path.home() / "AppData" / "Local"))
        return base / "LumenRAG"
    base = Path(os.getenv("XDG_DATA_HOME", Path.home() / ".local" / "share"))
    return base / "lumenrag"


def is_healthy(base_url: str, timeout: float = 1.0) -> bool:
    health_url = f"{base_url.rstrip('/')}/health"
    try:
        with urllib.request.urlopen(health_url, timeout=timeout) as response:
            return 200 <= response.status < 300
    except (OSError, urllib.error.URLError, ValueError):
        return False


def is_url_ready(url: str, timeout: float = 1.0) -> bool:
    try:
        with urllib.request.urlopen(url, timeout=timeout) as response:
            return 200 <= response.status < 300
    except (OSError, urllib.error.URLError, ValueError):
        return False


def discover_lumenvec_binary(explicit: Path | None = None) -> Path:
    configured = explicit or _configured_binary()
    if configured:
        candidate = configured.expanduser().resolve()
        if candidate.is_file():
            return candidate
        raise LauncherError(f"LumenVec binary does not exist: {candidate}")

    try:
        packaged = bundled_binary()
    except BundledAssetError as exc:
        raise LauncherError(str(exc)) from exc
    if packaged is not None:
        return packaged.resolve()

    names = ["lumenvec.exe", "lumenvec"] if os.name == "nt" else ["lumenvec"]
    for name in names:
        found = shutil.which(name)
        if found:
            return Path(found).resolve()

    for candidate in _development_binary_candidates():
        if candidate.is_file():
            return candidate.resolve()

    raise LauncherError(
        "LumenVec was not found. Pass --lumenvec-binary, set LUMENVEC_BINARY, "
        "or add lumenvec to PATH."
    )


def _configured_binary() -> Path | None:
    raw = os.getenv("LUMENVEC_BINARY", "").strip()
    return Path(raw) if raw else None


def _development_binary_candidates() -> list[Path]:
    project_root = Path(__file__).resolve().parents[2]
    database_root = project_root.parents[1] if len(project_root.parents) > 1 else None
    if database_root is None:
        return []
    lumenvec_root = database_root / "lumenvec"
    platform_pattern = "*windows*http*" if os.name == "nt" else f"*{sys.platform}*"
    executable = "lumenvec.exe" if os.name == "nt" else "lumenvec"
    release_candidates = sorted(
        lumenvec_root.glob(f"dist/release/{platform_pattern}/{executable}"),
        reverse=True,
    )
    direct_candidates = sorted(
        lumenvec_root.glob(f"dist/lumenvec-*-{sys.platform}-*"), reverse=True
    )
    return release_candidates + direct_candidates + [lumenvec_root / executable]


def _lumenvec_port(base_url: str) -> int:
    parsed = urlparse(base_url)
    local_hosts = {"127.0.0.1", "localhost", "::1"}
    if parsed.scheme != "http" or parsed.hostname not in local_hosts:
        raise LauncherError(
            "A managed LumenVec endpoint must use HTTP on localhost. "
            "Use --external-lumenvec for remote endpoints."
        )
    return parsed.port or 80


def lumenvec_environment(workspace: Path, base_url: str) -> dict[str, str]:
    data_dir = workspace / "lumenvec"
    vector_dir = data_dir / "vectors"
    vector_dir.mkdir(parents=True, exist_ok=True)
    environment = os.environ.copy()
    environment.update(
        {
            "VECTOR_DB_PROTOCOL": "http",
            "VECTOR_DB_PORT": str(_lumenvec_port(base_url)),
            "VECTOR_DB_SNAPSHOT_PATH": str(data_dir / "snapshot.json"),
            "VECTOR_DB_WAL_PATH": str(data_dir / "wal.log"),
            "VECTOR_DB_VECTOR_PATH": str(vector_dir),
            "VECTOR_DB_SEARCH_MODE": environment.get("VECTOR_DB_SEARCH_MODE", "ann"),
        }
    )
    return environment


def launch_lumenvec(
    binary: Path,
    workspace: Path,
    base_url: str,
    *,
    popen: Callable[..., Process] = subprocess.Popen,
) -> ManagedProcess:
    log_dir = workspace / "logs"
    process_dir = workspace / "lumenvec"
    log_dir.mkdir(parents=True, exist_ok=True)
    process_dir.mkdir(parents=True, exist_ok=True)
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0
    with (log_dir / "lumenvec.stdout.log").open("ab") as stdout, (
        log_dir / "lumenvec.stderr.log"
    ).open("ab") as stderr:
        process = popen(
            [str(binary)],
            cwd=process_dir,
            env=lumenvec_environment(workspace, base_url),
            stdout=stdout,
            stderr=stderr,
            creationflags=creationflags,
        )
    return ManagedProcess(process, use_process_group=os.name == "nt")


def wait_until_healthy(
    base_url: str,
    process: Process,
    timeout: float,
    *,
    health_check: Callable[[str, float], bool] = is_healthy,
) -> None:
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        exit_code = process.poll()
        if exit_code is not None:
            raise LauncherError(
                f"LumenVec exited during startup with code {exit_code}."
            )
        if health_check(base_url, 1.0):
            return
        time.sleep(0.15)
    raise LauncherError(f"LumenVec did not become healthy within {timeout:g} seconds.")


def ensure_lumenvec(
    options: StartOptions,
    *,
    health_check: Callable[[str, float], bool] = is_healthy,
    process_launcher: Callable[[Path, Path, str], ManagedProcess] = launch_lumenvec,
) -> ManagedProcess | None:
    if health_check(options.lumenvec_url, 1.0):
        print(f"[ok] Reusing LumenVec at {options.lumenvec_url}")
        return None
    if options.external_lumenvec:
        raise LauncherError(f"LumenVec is not reachable at {options.lumenvec_url}.")

    binary = discover_lumenvec_binary(options.lumenvec_binary)
    managed = process_launcher(binary, options.workspace, options.lumenvec_url)
    try:
        wait_until_healthy(
            options.lumenvec_url,
            managed.process,
            options.startup_timeout,
            health_check=health_check,
        )
    except Exception:
        managed.stop()
        raise
    print(f"[ok] LumenVec started at {options.lumenvec_url}")
    return managed


def _open_browser_when_ready(url: str) -> None:
    for _ in range(80):
        if is_url_ready(url, 0.5):
            webbrowser.open(url)
            return
        time.sleep(0.1)


def _run_studio(options: StartOptions) -> None:
    import uvicorn

    server = uvicorn.Server(
        uvicorn.Config(
            "rag_lumenvec.api.app:app",
            host=options.host,
            port=options.port,
            log_level="info",
        )
    )
    server.capture_signals = nullcontext

    watched_signals = [signal.SIGINT, signal.SIGTERM]
    if os.name == "nt" and hasattr(signal, "SIGBREAK"):
        watched_signals.append(signal.SIGBREAK)
    previous_handlers: dict[int, object] = {}

    def request_shutdown(_signum: int, _frame: object) -> None:
        server.should_exit = True

    try:
        for watched_signal in watched_signals:
            previous_handlers[watched_signal] = signal.getsignal(watched_signal)
            signal.signal(watched_signal, request_shutdown)
        server.run()
    finally:
        for watched_signal, previous_handler in previous_handlers.items():
            signal.signal(watched_signal, previous_handler)


def start(options: StartOptions) -> None:
    if not 1 <= options.port <= 65535:
        raise LauncherError("Studio port must be between 1 and 65535.")
    options.workspace.mkdir(parents=True, exist_ok=True)
    os.environ["LUMENVEC_BASE_URL"] = options.lumenvec_url
    os.environ["RAG_DATA_DIR"] = str(options.workspace / "rag_data")
    if not os.getenv("LUMENRAG_FRONTEND_DIST"):
        try:
            studio = bundled_studio()
        except BundledAssetError as exc:
            raise LauncherError(str(exc)) from exc
        if studio is not None:
            os.environ["LUMENRAG_FRONTEND_DIST"] = str(studio)

    managed = ensure_lumenvec(options)
    studio_url = f"http://{options.host}:{options.port}"
    try:
        if options.open_browser:
            threading.Thread(
                target=_open_browser_when_ready,
                args=(studio_url,),
                daemon=True,
            ).start()
        print(f"[ok] Workspace: {options.workspace}")
        print(f"[ok] LumenRAG Studio: {studio_url}")
        print("Press Ctrl+C to stop.")

        _run_studio(options)
    finally:
        if managed is not None:
            print("Stopping managed LumenVec...")
            managed.stop()
