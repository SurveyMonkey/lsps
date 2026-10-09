# lsps

Claude Code plugin marketplace for language server plugins (`name: "lsps"`). Plugins live under
`plugins/<plugin>/`, each with its own `.claude-plugin/plugin.json` and a row in
`.claude-plugin/marketplace.json`. [RFC 001](docs/rfc/001-lsp-marketplace.md) is the plan;
[ADR 001](docs/adr/001-typescript-toolchain.md) is the toolchain.

## Rules

- Plugin code is TypeScript run directly by node on the 22.18 floor; `.claude/rules/type-ts.md`.
- A plugin ships only what it runs. Tests live under `tests/`; `.claude/rules/path-plugins.md`.
- Shared code lives in the root `lib/`, reached through the committed symlink
  `plugins/<plugin>/src/lib -> ../../../lib`, the only path out of a plugin.
- Decisions go in `docs/adr/` and `docs/rfc/`, with an `index.md` row in the same pull request;
  `.claude/rules/path-docs.md`.
- Comments and Markdown follow `.claude/rules/_ste100.md`.

## Checks

`pnpm test` (coverage at 100), `pnpm exec tsc -p tsconfig.json`, `pnpm exec biome ci .
--error-on-warnings`, `claude plugin validate --strict` on the manifest and each plugin. CI job
names `vitest`, `vitest-floor`, `types`, `biome` and `plugin-validate` (from the first plugin on)
are the required checks on `main`; never rename one. `CONTRIBUTING.md` has the setup.

## Releasing

A plugin's version lives in its `plugin.json` and nowhere else. Bump it when the plugin's files
change; users receive an update only when that string changes. The marketplace manifest carries no
version.
