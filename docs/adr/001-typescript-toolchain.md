---
type: ADR
description: Plugin code is TypeScript run directly by node 22.18 or newer, with no build step. Plugins share one root `lib/` through a committed symlink and ship only run-time files. Tests live under `tests/`. Local hooks are staged-only; CI runs everything, with coverage at 100.
status: stable
created: 2026-10-08
owner: brianespinosa
related_issues: [2]
---

# ADR 001: The TypeScript toolchain

## Context

The plugins this marketplace holds were written against one toolchain in their source
marketplace, and `SurveyMonkey/skills` settled on the same one (its ADR 012). This repository
adopts it as is, so a plugin moves here without a rewrite, and so the three marketplaces stay on
one toolchain. [RFC 001](../rfc/001-lsp-marketplace.md) is the initiative.

Claude Code is a node process, and it copies a plugin's whole directory into each user's cache.
Anything a plugin ships runs on the user's node, with the user's `PATH`, and with no install
step of its own.

## Decision

1. **Runtime.** Plugin code is TypeScript that node 22.18 or newer runs directly, by type
   stripping. There is no build step. The file a reviewer reads is the file node runs. Code
   stays inside the erasable subset: no `enum`, no parameter properties, no namespaces. Every
   import names its `.ts` extension. `tsconfig.json` sets `erasableSyntaxOnly` and `nodenext`,
   so `tsc` refuses what node would refuse at launch.
2. **The floor is executed, not written down.** `.npmrc` pins the node pnpm runs,
   `engines.node` holds the floor, and the `vitest-floor` CI job runs the suite on 22.18.0.
   Every entry point and hook calls `assertNodeFloor` from `lib/node-floor.ts` first, before any
   other import loads.
3. **One shared `lib/`.** Code shared between plugins lives in the root `lib/`. Each plugin
   reaches it through the committed symlink `plugins/<plugin>/src/lib -> ../../../lib`, the one
   path out of a plugin. Claude Code's installer dereferences a link that resolves inside the
   marketplace, so the installed copy carries `lib/` with it. Shipped code imports nothing
   else: node's built-ins and its own tree. No plugin carries a `package.json`.
4. **A plugin ships run-time files only.** Tests, test helpers and fixtures live under
   `tests/`: `tests/plugins/<plugin>/` mirrors `plugins/<plugin>/src/`, and `tests/lib/`,
   `tests/harness/` cover `lib/` and `harness/`. A test imports plugin code through the
   `#<plugin>/*`, `#harness/*` and `#lib/*` aliases in the root `package.json`, which node,
   `tsc` and vitest all read. No directory below a plugin root takes the name of a plugin
   component (`skills`, `hooks`, `scripts`, and so on) unless it is that component.
5. **One dispatcher per plugin.** A plugin's entry point is `scripts/<plugin>.ts`, never
   `bin/`, which claude.ai rejects. Each subcommand is an exported command function in
   `src/subcommands/<command>.ts`: parsed arguments and injected clients in, exit code and
   output out. The command function is the test seam. One spawned contract test per plugin
   covers the dispatcher itself, through `harness/spawn.ts`.
6. **Gates by venue.** lefthook runs staged-only steps on commit: Biome over the staged files,
   `vitest related` over the tests the staged files reach, `tsc -p` over the project, and
   `claude plugin validate --strict` when a plugin or the manifest is touched. No hook runs a
   suite. CI runs everything: `vitest` (coverage at 100 on all four buckets, over a named source
   set, and a guard that refuses a report that names no file), `vitest-floor`, `types`, `biome`,
   and `plugin-validate`. Those five names are the required checks on `main`, matched by exact
   string.
7. **Coverage relief is exclusion, never a lower threshold.** A file that cannot be covered is
   excluded by name, with a comment that says why.

## Consequences

- A plugin from the source marketplace lands here with its tests and no code change, apart from
  the install id in its README and the `homepage` in its manifest.
- `lib/` is a copy, not a shared package. The marketplaces that share this toolchain carry the
  same files and must keep them in step by hand, until a later decision moves `lib/` into a
  package they all consume.
- A dependency added to the root `package.json` reaches only tests and tooling. Shipped code
  that needs a library has to vendor it into `lib/`, or do without.
- Renaming a CI job silently blocks every pull request, because the required check never
  reports again. Descriptive text goes in step names.
