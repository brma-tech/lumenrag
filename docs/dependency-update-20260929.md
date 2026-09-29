# LumenVec integration and dependency update

The wheel builder and native CI use Community v0.3.0-rc.1 at ee2052930f95024305fb6be19a74acb34049893d. Native jobs install frontend dependencies and select Go from the engine module. The release manifest is the source provenance for packaged engines.

Frontend audit initially reported baseline-browser-mapping (moderate), browserslist (high), and postcss-selector-parser (low). Compatible lockfile updates resolved all three; npm audit reports zero vulnerabilities and the frontend builds successfully.

Backend dependencies resolved successfully with FastAPI 0.141.1, pypdf 6.19.0 and python-multipart 0.0.32; these tested versions now form the minimum constraints in both dependency declarations. All 43 backend tests passed. The environment audit identified pip 26.1.2 (PYSEC-2026-3721), so validation uses pip >=26.2. This audit is a dependency check, not a full source security assessment.

Two additional provenance tests reject mismatched and modified engine sources, bringing the suite to 45 passing tests. CodeQL actions move to v4, matching the pending dependency update. The Intel macOS job uses the [supported macos-15-intel runner](https://github.com/actions/runner-images/issues/13045).

No OpenAI major-version migration or runtime API-key configuration is required by this update. Native cross-platform smoke results are tracked by CI; a local frontend build does not replace those checks.
