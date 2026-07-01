---
description: Bump the app version, tag it, and push to trigger the release workflow
argument-hint: "[major|minor|patch|X.Y.Z] (default: patch)"
---

Bump SentryGuard's version and cut a release. Version bump kind/target: `$ARGUMENTS` (default to `patch` if empty).

The single source of truth for the version is `frontend/package.json` (`version` field). The release workflow (`.github/workflows/release.yml`) triggers on push of a tag matching `v*.*.*` and builds+publishes the Electron app via `electron-builder`. Follow this exact process:

1. Make sure the working tree is clean and on `main`, up to date with `origin/main`. If there are uncommitted changes or the branch is behind, stop and tell the user instead of proceeding.
2. Read the current version from `frontend/package.json`. Compute the new version:
   - `patch` (default): bump the last number (e.g. 1.5.3 → 1.5.4)
   - `minor`: bump the middle number, reset patch to 0 (e.g. 1.5.3 → 1.6.0)
   - `major`: bump the first number, reset minor/patch to 0 (e.g. 1.5.3 → 2.0.0)
   - an explicit `X.Y.Z` value: use it as-is
3. Update the `version` field in `frontend/package.json` to the new version.
4. Look at `git log <last-tag>..HEAD --oneline` to see what's included since the last release, and write a short 1-2 sentence commit body summarizing it (same style as prior bump commits, e.g. `git show v1.5.2` or `git log --oneline -5`).
5. Commit with message `Bump version to X.Y.Z` (title) plus the summary body.
6. Create an annotated tag `vX.Y.Z` (e.g. `git tag -a v1.5.4 -m "v1.5.4"`).
7. Confirm with the user before pushing, unless they've already explicitly asked to release in this conversation turn (e.g. they invoked this command directly asking for a release). Then push the commit and the tag to `origin`: `git push origin main && git push origin vX.Y.Z`.
8. Verify the release workflow started: `gh run list --workflow=release.yml --limit 1`. Report the run status/URL to the user; do not wait/poll for it to finish unless asked.

Never bump or tag if there are already-tagged commits ahead of `origin/main` that haven't been reflected, and never force-push tags.
