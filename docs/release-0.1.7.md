# LumenRAG 0.1.7

Patch release for issues observed in 0.1.6.

- Load collection vectors through the paginated LumenVec API so the semantic
  graph can find chunks beyond the first page. Detect repeated cursors.
- Distinguish graph loading, empty data, and errors; provide a retry action and
  cancel obsolete browser requests.
- Use available screen width in the Studio, improve local artifact path layout,
  and resize the graph preview and nodes for readability.
- Default to 2,000 files per ingestion request. Configure another positive limit
  with `LUMENRAG_MAX_UPLOAD_FILES` and restart the server. Both multipart parsing
  and the ingestion endpoint enforce the limit; Studio displays it and prevents
  oversized batches. Processing within a batch remains sequential.

The bundled LumenVec engine remains Community v0.3.0-rc.1, revision
`ee2052930f95024305fb6be19a74acb34049893d`. Its source tree is identical to the
current Community main merge commit `2689d05e8e0eabf6ec83fdd39c9d47a93bdf1926`.

Validation includes API boundary tests with 2,000 uploaded files and simulated
ingestion providers, graph pagination tests, and browser checks at 1440, 1920,
and 2560 pixels. This does not establish throughput for 2,000 real documents or
paid embedding providers. The existing 25 MiB per-file limit is unchanged.

The release pipeline builds five platform wheels and runs installed-wheel
startup smoke tests on Windows amd64, Linux amd64, and both macOS architectures.
Linux arm64 receives cross-build and package validation, not a native smoke test.

Upgrade with `python -m pip install --upgrade lumenrag==0.1.7`.
Existing explicit environment settings continue to override defaults.
