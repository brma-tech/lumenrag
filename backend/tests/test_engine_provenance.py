import importlib
import json
from pathlib import Path

import pytest


@pytest.mark.parametrize("dirty", [False, True])
def test_wheel_builder_rejects_unpinned_or_modified_engine(
    monkeypatch, tmp_path, dirty
):
    root = Path(__file__).resolve().parents[2]
    monkeypatch.syspath_prepend(str(root))
    builder = importlib.import_module("build_wheels")
    expected = json.loads((root / "lumenvec-release.json").read_text())["revision"]
    (tmp_path / "go.mod").write_text("module example\n")
    monkeypatch.setattr(
        "sys.argv", ["build_wheels.py", "--lumenvec-root", str(tmp_path)]
    )
    outputs = iter(
        [expected if dirty else "wrong-revision", " M go.mod" if dirty else ""]
    )
    monkeypatch.setattr(
        builder.subprocess, "check_output", lambda *args, **kwargs: next(outputs)
    )
    with pytest.raises(RuntimeError, match="clean and match"):
        builder.main()
