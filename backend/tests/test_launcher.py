from __future__ import annotations

import os
import signal
import subprocess
from pathlib import Path

import pytest

from lumenrag.cli import build_parser, main
from lumenrag.launcher import (
    LauncherError,
    ManagedProcess,
    StartOptions,
    default_workspace,
    discover_lumenvec_binary,
    ensure_lumenvec,
    is_url_ready,
    lumenvec_environment,
)


class FakeProcess:
    def __init__(self, *, running: bool = True, wait_times_out: bool = False) -> None:
        self.running = running
        self.wait_times_out = wait_times_out
        self.terminated = False
        self.killed = False
        self.signals: list[int] = []

    def poll(self) -> int | None:
        return None if self.running else 0

    def wait(self, timeout: float | None = None) -> int:
        if self.wait_times_out and not self.killed:
            raise subprocess.TimeoutExpired("lumenvec", timeout)
        self.running = False
        return 0

    def terminate(self) -> None:
        self.terminated = True

    def kill(self) -> None:
        self.killed = True

    def send_signal(self, sig: int) -> None:
        self.signals.append(sig)


def test_parser_builds_start_command(tmp_path: Path) -> None:
    args = build_parser().parse_args(
        [
            "start",
            "--port",
            "9000",
            "--workspace",
            str(tmp_path),
            "--no-browser",
        ]
    )

    assert args.command == "start"
    assert args.port == 9000
    assert args.workspace == tmp_path
    assert args.no_browser is True


def test_parser_uses_lumenvec_url_from_environment(monkeypatch) -> None:
    monkeypatch.setenv("LUMENVEC_BASE_URL", "http://127.0.0.1:19999")

    args = build_parser().parse_args(["start"])

    assert args.lumenvec_url == "http://127.0.0.1:19999"


def test_url_readiness_checks_exact_url(monkeypatch) -> None:
    requested: list[str] = []

    class Response:
        status = 200

        def __enter__(self):
            return self

        def __exit__(self, *_args) -> None:
            return None

    def urlopen(url: str, timeout: float):
        requested.append(url)
        assert timeout == 0.5
        return Response()

    monkeypatch.setattr("lumenrag.launcher.urllib.request.urlopen", urlopen)

    assert is_url_ready("http://127.0.0.1:8000/", 0.5) is True
    assert requested == ["http://127.0.0.1:8000/"]


def test_default_workspace_honors_environment(monkeypatch, tmp_path: Path) -> None:
    monkeypatch.setenv("LUMENRAG_HOME", str(tmp_path))

    assert default_workspace() == tmp_path


def test_discover_binary_honors_explicit_path(tmp_path: Path) -> None:
    binary = tmp_path / "lumenvec"
    binary.write_bytes(b"binary")

    assert discover_lumenvec_binary(binary) == binary.resolve()


def test_discover_binary_rejects_missing_explicit_path(tmp_path: Path) -> None:
    with pytest.raises(LauncherError, match="does not exist"):
        discover_lumenvec_binary(tmp_path / "missing")


def test_discover_binary_prefers_packaged_engine(monkeypatch, tmp_path: Path) -> None:
    packaged = tmp_path / "packaged" / "lumenvec.exe"
    path_binary = tmp_path / "path" / "lumenvec.exe"
    packaged.parent.mkdir()
    path_binary.parent.mkdir()
    packaged.write_bytes(b"packaged")
    path_binary.write_bytes(b"path")
    monkeypatch.delenv("LUMENVEC_BINARY", raising=False)
    monkeypatch.setattr("lumenrag.launcher.bundled_binary", lambda: packaged)
    monkeypatch.setattr(
        "lumenrag.launcher.shutil.which", lambda _name: str(path_binary)
    )

    assert discover_lumenvec_binary() == packaged.resolve()


def test_lumenvec_environment_isolates_data(tmp_path: Path) -> None:
    environment = lumenvec_environment(tmp_path, "http://127.0.0.1:19200")

    assert environment["VECTOR_DB_PORT"] == "19200"
    assert environment["VECTOR_DB_PROTOCOL"] == "http"
    assert environment["VECTOR_DB_SEARCH_MODE"] == "ann"
    assert environment["VECTOR_DB_WAL_PATH"] == str(
        tmp_path / "lumenvec" / "wal.log"
    )
    assert (tmp_path / "lumenvec" / "vectors").is_dir()


def test_managed_endpoint_must_be_local(tmp_path: Path) -> None:
    with pytest.raises(LauncherError, match="localhost"):
        lumenvec_environment(tmp_path, "https://example.com:19190")


def test_ensure_lumenvec_reuses_healthy_endpoint(tmp_path: Path) -> None:
    options = StartOptions(workspace=tmp_path)

    managed = ensure_lumenvec(options, health_check=lambda _url, _timeout: True)

    assert managed is None


def test_external_lumenvec_must_be_healthy(tmp_path: Path) -> None:
    options = StartOptions(workspace=tmp_path, external_lumenvec=True)

    with pytest.raises(LauncherError, match="not reachable"):
        ensure_lumenvec(options, health_check=lambda _url, _timeout: False)


def test_ensure_lumenvec_starts_and_waits(tmp_path: Path) -> None:
    binary = tmp_path / "lumenvec"
    binary.write_bytes(b"binary")
    process = FakeProcess()
    calls = 0

    def health_check(_url: str, _timeout: float) -> bool:
        nonlocal calls
        calls += 1
        return calls >= 2

    options = StartOptions(
        workspace=tmp_path,
        lumenvec_binary=binary,
        startup_timeout=1,
    )
    managed = ensure_lumenvec(
        options,
        health_check=health_check,
        process_launcher=lambda _binary, _workspace, _url: ManagedProcess(process),
    )

    assert managed is not None
    assert managed.process is process
    assert calls == 2


def test_managed_process_escalates_to_kill(monkeypatch) -> None:
    process = FakeProcess(wait_times_out=True)
    monkeypatch.setattr(os, "name", "posix")

    ManagedProcess(process).stop(timeout=0.01)

    assert process.terminated is True
    assert process.killed is True


@pytest.mark.skipif(os.name != "nt", reason="Windows process group behavior")
def test_managed_process_uses_ctrl_break_on_windows() -> None:
    process = FakeProcess()

    ManagedProcess(process, use_process_group=True).stop()

    assert process.signals == [signal.CTRL_BREAK_EVENT]


def test_cli_reports_launcher_errors(monkeypatch, capsys, tmp_path: Path) -> None:
    def fail(_options: StartOptions) -> None:
        raise LauncherError("test failure")

    monkeypatch.setattr("lumenrag.cli.start", fail)

    exit_code = main(["start", "--workspace", str(tmp_path), "--no-browser"])

    assert exit_code == 1
    assert "test failure" in capsys.readouterr().err
