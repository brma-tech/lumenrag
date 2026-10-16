# LumenRAG 0.1.8

## Changes

- Align Studio with the LumenVec visual identity: official borderless CSS logo, SVG favicon, dark surfaces, violet actions, and cyan accents.
- Simplify navigation, dashboard, chat messages, sources, and document filters by removing redundant borders and shadows.
- Improve reading width and spacing on large screens and preserve mobile message widths.
- Make evaluation history compact, with sources, run IDs, and local artifact paths available in expandable details.
- Show loading feedback on history actions and move focus and viewport to the selected evaluation details.

## Compatibility

No API, storage, ingestion-limit, or vector-index changes. The bundled LumenVec engine remains pinned to the existing Community core.

Upgrade with `python -m pip install --upgrade lumenrag==0.1.8`.

Release artifacts cover Windows x64, Linux x64/ARM64, and macOS x64/ARM64. Linux ARM64 is cross-built; the other four wheels receive native smoke tests in the release workflow.
