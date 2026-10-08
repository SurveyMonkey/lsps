---
type: RFC
description: Moves the three Claude Code language server plugins (lsp-merge, typescript7-lsp, biome-lsp) out of the marketplaces that carry them today, among them SurveyMonkey/skills and sm-incubator/org-claude, into this repository, as one public marketplace named `lsps`, with the TypeScript toolchain those plugins were built against.
status: draft
created: 2026-10-08
owner: brianespinosa
related_milestones: []
related_adrs: []
---

# RFC 001: One marketplace for the language server plugins

## Summary

Three marketplaces ship Claude Code language server plugins today, and one plugin is in all
three. `typescript7-lsp` exists as a copy in `SurveyMonkey/skills`, `sm-incubator/org-claude`
and a third, personal marketplace (the source marketplace below). A fix to its `.lsp.json` must
land three times, under three install ids, and the three copies have already drifted: one
carries a `homepage`, one a different `enabledPlugins` example. `lsp-merge` and `biome-lsp`
exist only in the source marketplace, so a SurveyMonkey repository that wants merged
diagnostics must trust a personal source. This RFC proposes one public marketplace, `lsps`, in
`SurveyMonkey/lsps`, that holds every language server plugin, and
that the three marketplaces that carry copies drop them.

## Motivation

- **One plugin, three copies.** `plugins/typescript7-lsp` is byte-identical across the three
  repositories except for `homepage`, `LICENSE` and the marketplace name in the README. Each
  copy has its own version string and its own install id. A user who moves between
  repositories installs the same server twice.
- **A plugin in a catch-all marketplace.** The source marketplace holds GitHub workflow, issue
  tracker, diagram and context-audit plugins, and three language servers. Its own rule says a
  plugin is one domain, and that two marketplaces that each want the same plugin signal a
  domain boundary that is off. `skills` and `org-claude` each wanted `typescript7-lsp`, and
  each took a copy.
- **A public repository that cannot point at a personal one.** `skills` and `org-claude` are
  public SurveyMonkey and sm-incubator repositories. Their settings and rules cannot send a
  teammate to a personal marketplace for a language server.
- **Why now.** `lsp-merge` landed on 2026-09-29 and is the first long-lived process in the
  source marketplace. Its open issues are all about language servers. Moving before more
  lands keeps the move to one plugin with code and two manifest-only plugins.

## Goals / Non-Goals

Goals:

- Every language server plugin lives here, once. Install ids are `lsp-merge@lsps`,
  `typescript7-lsp@lsps` and `biome-lsp@lsps`.
- The toolchain here is the one `lsp-merge` was written against: TypeScript run directly by
  node on the 22.18 floor, pnpm, Biome, vitest at 100 percent coverage, lefthook, the same
  layout rules (`plugins/`, `lib/`, `harness/`, `tests/`, `docs/`).
- `skills`, `org-claude` and the source marketplace point at this marketplace and ship no
  language server plugin.
- This repository is public, so each consumer needs no credential to install.

Non-goals:

- No change to what any plugin does. The move ships the plugins as they are, at their current
  versions.
- No decision on the future of `typescript7-lsp` and `biome-lsp` now that `lsp-merge` runs
  both. That question moves here as an issue and waits for field time.
- No shared `lib/` across the marketplaces. This repository takes its own copy of the six
  `lib/` files `lsp-merge` imports. The drift between the copies is a known cost (see
  Trade-offs).

## Proposed Approach

### Marketplace

`.claude-plugin/marketplace.json` with `name: "lsps"`, the same convention as `skills`
(marketplace name equals repository name, plural). The repository was created as `lsp` and
renamed to `lsps` on 2026-10-08, before any plugin landed. The marketplace name is fixed from
the first commit, because it is the `@` suffix in every `enabledPlugins` key and cannot change
later.
Three relative-path entries. Owner is SurveyMonkey Engineering, as in `skills`. Each plugin's
`plugin.json` gains a `homepage` under this repository. LICENSE files keep the author line they
carry today.

### Toolchain

Copied from the source marketplace, not from `skills`:

- `skills` still carries bash and shellspec for `gh-security`. This repository has none.
- `lsp-merge` and its 11 test files import `#lsp-merge/*`, `#harness/paths.ts`,
  `#harness/sandbox.ts` and `#harness/spawn.ts`, which exist in the source marketplace's
  harness and not in `skills`'.

What comes over: `package.json` (imports map trimmed to `#lsp-merge/*`, `#harness/*`,
`#lib/*`), `pnpm-lock.yaml`, `.npmrc`, `tsconfig.json`, `biome.json`, `vitest.config.ts`
without the `cobertura` reporter (it fed a coverage ruleset this repository does not have),
`lefthook.yml`, `.github/actions/node-pnpm`, `ci.yml` without the `eslint` job and the
coverage upload, `plugin-validate.yml`, `codeql.yml`.

`lib/`: `node-floor`, `typesafe`, `dependencies`, `hook-output`, `process`, `streams`, with
their tests. `harness/`: `paths`, `sandbox`, `spawn`, with their tests. `tests/repo/`:
`repo-layout.test.ts` and `labeler.test.ts`. `.claude/rules/`: `_design-principles`,
`_ste100`, `path-plugins`, `path-hooks`, `type-ts`, `path-docs`, `path-docs-adr`,
`path-docs-rfc`.

### Plugins and records

`plugins/lsp-merge`, `plugins/typescript7-lsp`, `plugins/biome-lsp` and
`tests/plugins/lsp-merge` are copied, with the source commit SHA in the commit message. The
`src/lib -> ../../../lib` symlink is kept as a link. The lsp-merge design record becomes ADR
002 here. ADR 001 here records the toolchain: TypeScript run directly by node on the 22.18
floor with no build step, one root `lib/` symlinked into each plugin, tests only under
`tests/`, local hooks staged-only and CI as the enforcement venue, 100 percent coverage.

### This repository's own sessions

`.claude/settings.json` registers the `lsps` marketplace and enables `lsp-merge@lsps`, with
`.claude/lsp-merge.json` for `typescript7` and `biome`. Until the first push lands,
`claude --plugin-dir plugins/lsp-merge` loads it in place.

## Alternatives Considered

- **Leave the plugins in the source marketplace and have `skills` and `org-claude` reference
  it.** A public SurveyMonkey repository would send teammates to a personal marketplace.
  Rejected.
- **Move the plugins into `SurveyMonkey/skills`.** `skills` is the gh-security marketplace with
  a bash and shellspec toolchain mid-port. Its own plugin-domain rule says a user who wants one
  skill should not install unrelated ones, and language servers are a domain of their own.
  Rejected.
- **A second marketplace inside `SurveyMonkey/skills`.** A cloned marketplace (`github` or `git`
  source) is read from `.claude-plugin/marketplace.json` at the repository root only. `plugin
  marketplace add` has no subdirectory option; `--sparse` narrows the checkout, not the manifest
  path. A `url` source can point at a raw `marketplace.json` in a subdirectory, but then every
  relative-path entry fails at install, and each entry needs a `git-subdir` source back into the
  same repository. A `#ref` per catalog is the release-channel pattern, not a second domain.
  One marketplace per repository is the only plain layout. Rejected.
- **Keep three copies and sync them.** A sync tool is more machinery than the plugins it
  syncs. Rejected.
- **A marketplace with no toolchain, manifests only.** `lsp-merge` is 1,000 lines of
  TypeScript with 1,500 lines of tests that drive real fake child servers. Shipping it without
  its tests and gates drops coverage from 100 to zero. Rejected.
- **`git filter-repo` to keep history.** Each plugin has one or two commits at its source. The
  source SHA in the commit message is enough. Rejected.

## Trade-offs & Risks

- **Another copy of `lib/`.** The marketplaces are already converging on one toolchain by
  hand. One more repository widens the drift. Mitigation: this copy is six files, and a later
  RFC can move `lib/` to a package all of them consume.
- **No enforcement until public.** The repository is private on a free-tier org today, so it
  has no rulesets and no required status checks. CI runs but blocks nothing. The repository
  goes public at the end of the rollout; rulesets go on then.
- **Install ids change for every current user.** Each old install id becomes `<plugin>@lsps`.
  Each marketplace that drops a copy maps the old name to `null` in a `renames` map, so a user
  with the old key sees "Removed from marketplace" once, then installs from `lsps`. There is no
  cross-marketplace rename.
- **Private window.** During the rollout, a session that switches to `lsp-merge@lsps` needs git
  access to a private repository. Mitigation: switch consumers after the repository is public.

## Rollout / Migration Plan

Each phase is a pull request, or one per repository. Phase order matters.

1. **Scaffold this repository.** Toolchain, `lib/`, `harness/`, `tests/lib`, `tests/harness`,
   `tests/repo`, rules, `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, LICENSE, the marketplace
   manifest with no entries, this RFC and ADR 001. `pnpm test` passes with the `lib/` and
   `harness/` tests.
2. **Move the plugins.** The three plugins, `tests/plugins/lsp-merge`, ADR 002, the three
   marketplace entries, `.claude/settings.json` and `.claude/lsp-merge.json`. `claude plugin
   validate --strict` passes on the manifest and each plugin. `pnpm test` at 100 percent.
3. **Carry the open plugin issues here.** Issues cannot transfer across owners, so each open
   issue on the three plugins is recreated here with its body, and closed at its source with
   a link forward.
4. **Remove from `SurveyMonkey/skills` and `sm-incubator/org-claude`.** Drop
   `plugins/typescript7-lsp`, add a `renames` entry, point `.claude/settings.json`, README,
   CLAUDE.md and (in org-claude) `.claude/rules/file-lsp-plugins-org.md` at
   `typescript7-lsp@lsps`. These are public repositories, so this phase needs this repository
   public first.
5. **Remove from the source marketplace.** Drop the three plugins, their tests, their import
   alias, labeler rules, README sections and marketplace entries, with a `renames` map. Its
   lsp-merge design record stays, deprecated, with a link here. Its settings register `lsps`
   and enable `lsp-merge@lsps`. Its `.claude/lsp-merge.json` stays; it is project config.
   This work is tracked in that repository.
6. **Make the repository public, add rulesets.** Protect `main`,
   require `vitest`, `vitest-floor`, `types`, `biome` and `plugin-validate` after each has
   reported on `main` once.

Phases 4 and 5 run after 6 when the private window matters more than the order.

## Open Questions

- Does the SurveyMonkey org get rulesets at all on its plan, once the repository is public?
  Public repositories on a free org get branch protection; the rulesets API answer today was a
  plan limit. Check after phase 6.
- Does `skills` keep a `typescript7-lsp` reference in its testing skill files
  (`.claude/skills/testing/`), or do those mention only `tsc`? Check in phase 4.

## Decisions & Follow-ups

- Marketplace name `lsps`, after the `skills` convention (name equals repository, plural).
  The repository was renamed from `lsp` to `lsps` before phase 1; the marketplace name never
  changes.
- LICENSE author line stays as shipped today.
- The typescript7-lsp and biome-lsp future question moves here unchanged. No deprecation in
  the move.
- Plain copy with source SHAs, no history rewrite.
- Follow-up: one `lib/` for every marketplace (a later RFC).

## Related

- SurveyMonkey/skills: ADR 012 (TypeScript on node 22.18), #215 (TypeScript language server
  for sessions).
- sm-incubator/org-claude: #102 (typescript7-lsp plugin), #104 (LSP plugin rule).
- Docs: [Host and maintain a marketplace](https://code.claude.com/docs/en/plugins/host-marketplace),
  [Create a marketplace](https://code.claude.com/docs/en/plugins/create-marketplace),
  [Plugin commands reference](https://code.claude.com/docs/en/plugins/cli-reference#plugin-marketplace-add).
