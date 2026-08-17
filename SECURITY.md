# Security policy

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Contact the project maintainer through the private security contact configured in the GitHub repository, including reproduction steps, affected versions, and potential impact. The maintainer will acknowledge the report and coordinate a fix and disclosure timeline.

## Contribution safeguards

- Pull requests from the community run in an isolated, read-only CI context.
- Secrets are never exposed to forked pull request builds.
- Dependency, secret, and static security scans run before merge.
- `main` requires passing checks and an approving code-owner review.
- Outbound network destinations must remain explicitly allowlisted.

## Maintainer repository settings

Configure the `main` branch with these protections:

- Require a pull request with at least one approving review.
- Require approval from CODEOWNERS and dismiss stale approvals after new commits.
- Require the `Security gate` and all `LumenRAG CI` quality checks to pass.
- Require branches to be up to date and block force pushes and deletions.

To enable approval e-mail notifications, add these repository Actions secrets: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, and `SECURITY_APPROVAL_EMAIL`. The notification workflow only handles pull request metadata and never checks out or executes code from a contributor's fork.

If the repository's private security contact is not visible, open a minimal issue asking for the security contact without including sensitive details.
