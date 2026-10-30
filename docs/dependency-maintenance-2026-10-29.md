# Dependency maintenance after 0.1.10

This maintenance change consolidates Dependabot PRs #54, #55, #56, #59,
#60, #62 and #63 on top of the 0.1.10 collection fix. The published 0.1.10
artifacts remain tied to their original immutable release tag.

## Accepted updates

- Radix Dialog 1.3.1 and Tooltip 1.4.1, with their resolved transitive dependencies.
- Autoprefixer 10.6.1 and Vite 8.3.5.
- Ruff minimum version 0.17.2 for development and CI.
- `actions/download-artifact@v8`, preserving `path` and `merge-multiple`.
- `softprops/action-gh-release@v3`, retaining the existing release inputs.

The Actions changes target GitHub-hosted runners. The upstream download action
documents compatibility with artifacts uploaded by v4 and later. The release
action v3 uses the Node 24 Actions runtime; this is separate from the application
build's `actions/setup-node` runtime, which remains Node 22.

References:

- https://github.com/actions/download-artifact/tree/v8
- https://github.com/softprops/action-gh-release/blob/v3/CHANGELOG.md

## Node types policy

PR #58 proposes Node 26 types while CI and release builds use Node 22. Keep
`@types/node` on major 22 so TypeScript does not silently accept newer runtime
APIs. Dependabot may still update minor and patch versions within that major.
A Node runtime upgrade and its type definitions should be reviewed together.

## Validation

- Production frontend build (TypeScript and Vite).
- Backend test suite, including collection persistence tests.
- npm dependency audit.
- Ruff check using the updated version.
- Required GitHub CI and security checks before integration.

The release-only Actions are reviewed against their upstream documentation;
ordinary pull-request CI does not execute PyPI publishing or create releases.
