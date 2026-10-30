# AGENTS.md

Notes for AI agents working in this repository.

## Workflow

- Do not open pull requests. Commit and push directly to `main`.
- Before pushing, run `bun run tsc`, `bun run lint`, `bun test` and `bun run build`, and commit the rebuilt `userscript/LDPP.user.js`.
- Bump `VERSION_DATE` in `build.ts` when a change should reach installed copies, so script managers pick up the update.
