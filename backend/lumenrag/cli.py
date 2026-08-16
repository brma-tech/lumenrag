from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

from lumenrag import __version__
from lumenrag.launcher import LauncherError, StartOptions, default_workspace, start


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="lumenrag",
        description="Local-first RAG studio powered by LumenVec.",
    )
    parser.add_argument("--version", action="version", version=__version__)
    commands = parser.add_subparsers(dest="command", required=True)

    start_parser = commands.add_parser("start", help="Start the local RAG studio")
    start_parser.add_argument("--host", default="127.0.0.1", help="Studio host")
    start_parser.add_argument("--port", type=int, default=8000, help="Studio port")
    start_parser.add_argument(
        "--workspace",
        type=Path,
        default=default_workspace(),
        help="Directory used for local data and logs",
    )
    start_parser.add_argument(
        "--lumenvec-url",
        default=os.getenv("LUMENVEC_BASE_URL", "http://127.0.0.1:19190"),
        help="Existing or locally managed LumenVec HTTP endpoint",
    )
    start_parser.add_argument(
        "--lumenvec-binary",
        type=Path,
        help="Path to a LumenVec executable",
    )
    start_parser.add_argument(
        "--external-lumenvec",
        action="store_true",
        help="Require an already running LumenVec instead of starting one",
    )
    start_parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Do not open the Studio in the default browser",
    )
    start_parser.add_argument(
        "--startup-timeout",
        type=float,
        default=20.0,
        help="Seconds to wait for LumenVec startup",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if args.command != "start":  # pragma: no cover - argparse enforces this
        return 2

    options = StartOptions(
        host=args.host,
        port=args.port,
        workspace=args.workspace.expanduser().resolve(),
        lumenvec_url=args.lumenvec_url,
        lumenvec_binary=args.lumenvec_binary,
        external_lumenvec=args.external_lumenvec,
        open_browser=not args.no_browser,
        startup_timeout=args.startup_timeout,
    )
    try:
        start(options)
    except LauncherError as exc:
        print(f"LumenRAG could not start: {exc}", file=sys.stderr)
        return 1
    except KeyboardInterrupt:
        return 130
    return 0
