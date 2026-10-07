# LumenRAG distribution

Status: release 0.1.6 prepared; publication is triggered by its reviewed main tag.
Version: 0.1.6

## Package contents

Each platform wheel contains `lumenrag`, `rag_lumenvec`, the Studio build, a
manifest with SHA-256 hashes, and the matching bundled LumenVec executable.
The LumenRAG and LumenVec components are MIT-licensed.

| Target | Wheel tag | Build and validation |
| --- | --- | --- |
| Windows amd64 | `win_amd64` | Native build and installed-wheel startup smoke test |
| Linux amd64 | `manylinux_2_17_x86_64` | Native build and installed-wheel startup smoke test |
| Linux arm64 | `manylinux_2_17_aarch64` | Cross-build and wheel/manifest validation |
| macOS Intel | `macosx_11_0_x86_64` | Native build and installed-wheel startup smoke test |
| macOS Apple Silicon | `macosx_11_0_arm64` | Native build and installed-wheel startup smoke test |

All Go engine builds use `CGO_ENABLED=0`; the builder verifies the pinned,
clean LumenVec source revision and hashes every packaged asset. Linux arm64 is
cross-built on Linux amd64, so its installed runtime is not natively smoke
tested in this workflow.

## Release gates and publication

The reviewed source change updates every backend/API/frontend version reference
to 0.1.6. Before publishing, CI must pass for the exact commit. The
`.github/workflows/release.yml` workflow only accepts a semantic version tag
whose commit is already an ancestor of `main`, and verifies that the tag agrees
with `backend/pyproject.toml`.

For every tag it builds all five platform wheels, runs the installed-wheel
startup smoke test on the four native targets, validates the Linux arm64 wheel,
and gathers the artifacts. Only when all builds and checks pass does the
workflow upload the wheels to PyPI using the repository's `PYPI_API_TOKEN`
secret, create `SHA256SUMS.txt`, and publish a GitHub release with the same
wheel files and checksums. A duplicate PyPI version is not overwritten.

This release path publishes directly to production PyPI because that
publication was explicitly authorized. TestPyPI is not part of this workflow.
No package is published by a normal branch push or pull request.

## Rollback and recovery

PyPI files for an existing version are immutable and are not deleted or
overwritten by this pipeline. If a published wheel is defective, stop promotion
and publish a corrected patch version; mark the defective PyPI release
yanked with an explicit reason. GitHub release assets can be replaced, so retain
the published SHA256 checksums and PyPI file digests as the canonical evidence.
