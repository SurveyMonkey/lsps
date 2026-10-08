---
type: RFC
description: Moves the three Claude Code language server plugins (lsp-merge, typescript7-lsp, biome-lsp) out of bje-settings/claude, SurveyMonkey/skills and sm-incubator/org-claude into this repository, as one public marketplace named `lsps`, with the TypeScript toolchain those plugins were built against.
status: draft
created: 2026-10-08
owner: brianespinosa
related_milestones: []
related_adrs: []
---

# RFC 001: One marketplace for the language server plugins

## Summary

Three marketplaces ship Claude Code language server plugins today, and one plugin is in all
three. `typescript7-lsp` exists as a copy in `bje-settings/claude`, `SurveyMonkey/skills` and
`sm-incubator/org-claude`. A fix to its `.lsp.json` must land three times, under three install
ids (`@bje`, `@skills`, `@lab`), and the three copies have already drifted: one carries a
`homepage`, one a different `enabledPlugins` example. `lsp-merge` and `biome-lsp` exist only in
`bje-settings/claude`, a personal marketplace, so a SurveyMonkey repository that wants merged
diagnostics must trust a personal source. This RFC proposes one public marketplace, `lsps`, in
`SurveyMonkey/lsps` (today `SurveyMonkey/lsp`), that holds every language server plugin, and that the three source
marketplaces drop their copies.

## Motivation

- **One plugin, three copies.** `plugins/typescript7-lsp` is byte-identical across the three
  repositories except for `homepage`, `LICENSE` and the marketplace name in the README. Each
  copy has its own version string and its own install id. A user who moves between a bje repo
  and a SurveyMonkey repo installs the same server twice.
- **A plugin in a catch-all marketplace.** `bje-settings/claude` is "bje Claude Code plugins":
  GitHub workflow, issue trackers, diagrams, context audits, and three language servers. Its
  own `CLAUDE.md` says a plugin is one domain, and that two plugins that would each want the
  same skill signal a domain boundary that is off. `skills` and `org-claude` each wanted
  `typescript7-lsp`, and each took a copy.
- **A public repository that cannot point at a personal one.** `skills` and `org-claude` are
  public SurveyMonkey and sm-incubator repositories. Their settings and rules cannot send a
  teammate to `bje-settings/claude` for a language server.
- **Why now.** `lsp-merge` landed on 2026-09-29 (bje ADR 006) and is the first long-lived
  process in that marketplace. Its open issues (#322 to #327 there) are all about language
  servers. Moving before more lands keeps the move to one plugin with code and two
  manifest-only plugins.

## Goals / Non-Goals

Goals:

- Every language server plugin lives here, once. Install ids are `lsp-merge@lsps`,
  `typescript7-lsp@lsps` and `biome-lsp@lsps`.
- The toolchain here is the one `lsp-merge` was written against: TypeScript run directly by
  node on the 22.18 floor, pnpm, Biome, vitest at 100 percent coverage, lefthook, the same
  layout rules (`plugins/`, `lib/`, `harness/`, `tests/`, `docs/`).
- `bje-settings/claude`, `skills` and `org-claude` point at this marketplace and ship no
  language server plugin.
- This repository is public, so each consumer needs no credential to install.

Non-goals:

- No change to what any plugin does. The move ships the plugins as they are, at their current
  versions.
- No decision on the future of `typescript7-lsp` and `biome-lsp` now that `lsp-merge` runs
  both (bje #327). That issue moves here and waits for field time, as it says.
- No shared `lib/` across the three marketplaces. This repository takes its own copy of the
  six `lib/` files `lsp-merge` imports. The drift between the copies is a known cost (see
  Trade-offs).

## Proposed Approach

### Marketplace

`.claude-plugin/marketplace.json` with `name: "lsps"`, the same convention as `skills`
(marketplace name equals repository name, plural). The repository is `SurveyMonkey/lsp` today
and is renamed to `lsps` during the rollout. The marketplace name is fixed from the first
commit, because it is the `@` suffix in every `enabledPlugins` key and cannot change later. A
repository rename is a settings-string change in each consumer; GitHub redirects the old URL. Three relative-path entries. Owner is SurveyMonkey
Engineering, as in `skills`. Each plugin's `plugin.json` gains a `homepage` under this
repository. LICENSE files keep the author line they carry today.

### Toolchain

Copied from `bje-settings/claude`, not from `skills`:

- `skills` still carries bash and shellspec for `gh-security`. This repository has none.
- `lsp-merge` and its 11 test files import `#lsp-merge/*`, `#harness/paths.ts`,
  `#harness/sandbox.ts` and `#harness/spawn.ts`, which exist in bje's harness and not in
  `skills`'.

What comes over: `package.json` (imports map trimmed to `#lsp-merge/*`, `#harness/*`,
`#lib/*`), `pnpm-lock.yaml`, `.npmrc`, `tsconfig.json`, `biome.json`, `vitest.config.ts`
without the `cobertura` reporter (it fed the bje enterprise ruleset), `lefthook.yml`,
`.github/actions/node-pnpm`, `ci.yml` without the `eslint` job and the coverage upload,
`plugin-validate.yml`, `codeql.yml`.

`lib/`: `node-floor`, `typesafe`, `dependencies`, `hook-output`, `process`, `streams`, with
their tests. `harness/`: `paths`, `sandbox`, `spawn`, with their tests. `tests/repo/`:
`repo-layout.test.ts` and `labeler.test.ts`. `.claude/rules/`: `_design-principles`,
`_ste100`, `path-plugins`, `path-hooks`, `type-ts`, `path-docs`, `path-docs-adr`,
`path-docs-rfc`.

### Plugins and records

`plugins/lsp-merge`, `plugins/typescript7-lsp`, `plugins/biome-lsp` and
`tests/plugins/lsp-merge` are copied, with the source commit SHA in the commit message. The
`src/lib -> ../../../lib` symlink is kept as a link. bje ADR 006 (lsp-merge design) becomes
ADR 002 here. ADR 001 here records that the toolchain is adopted by reference from bje ADR
001, 002 and 004 and skills ADR 012.

### This repository's own sessions

`.claude/settings.json` registers the `lsps` marketplace and enables `lsp-merge@lsps`, with
`.claude/lsp-merge.json` for `typescript7` and `biome`, the same as bje today. Until the first
push lands, `claude --plugin-dir plugins/lsp-merge` loads it in place.

## Alternatives Considered

- **Leave the plugins in `bje-settings/claude` and have `skills` and `org-claude` reference
  it.** A public SurveyMonkey repository would send teammates to a personal marketplace. The
  bje enterprise rulesets also do not apply to SurveyMonkey. Rejected.
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
- **`git filter-repo` to keep history.** Each plugin has one or two commits in bje. The source
  SHA in the commit message is enough. Rejected.

## Trade-offs & Risks

- **A third copy of `lib/`.** The three marketplaces are already converging on one toolchain
  by hand. A fourth repository widens the drift. Mitigation: this copy is six files, and a
  later RFC can move `lib/` to a package all four consume.
- **No enforcement until public.** The repository is private on a free-tier org today, so it
  has no rulesets and no required status checks. CI runs but blocks nothing. The repository
  goes public at the end of the rollout; rulesets go on then.
- **Install ids change for every current user.** `lsp-merge@bje` becomes `lsp-merge@lsps`, and
  likewise for the other two. Each source marketplace maps the old name to `null` in a
  `renames` map, so a user with the old key sees "Removed from marketplace" once, then installs
  from `lsps`. There is no cross-marketplace rename.
- **Private window.** During the rollout, bje sessions that switch to `lsp-merge@lsps` need git
  access to a private repository. Mitigation: flip `bje-settings/claude` last, or after the
  repository is public.

## Rollout / Migration Plan

Each phase is a pull request, or one per repository. Phase order matters.

1. **Scaffold this repository.** Toolchain, `lib/`, `harness/`, `tests/lib`, `tests/harness`,
   `tests/repo`, rules, `CLAUDE.md`, `README.md`, `CONTRIBUTING.md`, LICENSE, the marketplace
   manifest with no entries, this RFC and ADR 001. `pnpm test` passes with the `lib/` and
   `harness/` tests.
2. **Move the plugins.** The three plugins, `tests/plugins/lsp-merge`, ADR 002, the three
   marketplace entries, `.claude/settings.json` and `.claude/lsp-merge.json`. `claude plugin
   validate --strict` passes on the manifest and each plugin. `pnpm test` at 100 percent.
3. **Recreate the open issues here.** bje #322, #323, #325, #326, #327 cannot transfer across
   owners. Each is recreated here with its body and a link back, and closed there with a link
   forward. bje #324 stays open with its lsp-merge row dropped.
4. **Remove from `SurveyMonkey/skills` and `sm-incubator/org-claude`.** Drop
   `plugins/typescript7-lsp`, add a `renames` entry, point `.claude/settings.json`, README,
   CLAUDE.md and (in org-claude) `.claude/rules/file-lsp-plugins-org.md` at
   `typescript7-lsp@lsps`. These are public repositories, so this phase needs this repository
   public first.
5. **Remove from `bje-settings/claude`.** Drop the three plugins, `tests/plugins/lsp-merge`,
   the `#lsp-merge/*` import, three labeler rules, README sections, the CLAUDE.md "Language
   server" section, CONTRIBUTING lines, and the three marketplace entries with a `renames`
   map. ADR 006 stays with `status: deprecated` and a link here. `.claude/settings.json`
   registers `lsps` and enables `lsp-merge@lsps`. `.claude/lsp-merge.json` stays; it is project
   config.
6. **Rename the repository to `lsps`, make it public, add rulesets.** Update the
   `extraKnownMarketplaces` repo string in every consumer in the same step. Protect `main`, require `vitest`,
   `vitest-floor`, `types`, `biome` and `plugin-validate` after each has reported on `main`
   once.

Phases 4 and 5 can run after 6 when the private window matters more than the order.

## Open Questions

- Does the SurveyMonkey org get rulesets at all on its plan, once the repository is public?
  Public repositories on a free org get branch protection; the rulesets API answer today was a
  plan limit. Check after phase 6.
- Does `skills` keep a `typescript7-lsp` reference in its testing skill files
  (`.claude/skills/testing/`), or do those mention only `tsc`? Check in phase 4.

## Decisions & Follow-ups

- Marketplace name `lsps`, after the `skills` convention (name equals repository, plural).
  The repository is renamed from `lsp` to `lsps` in phase 6; the marketplace name never changes.
- LICENSE author line stays as shipped today.
- bje #327 moves here unchanged. No deprecation in the move.
- Plain copy with source SHAs, no history rewrite.
- Follow-up: one `lib/` for the four repositories (a later RFC).

## Related

- bje-settings/claude: RFC 001, ADR 001, 002, 004, 006; issues #193, #312, #313, #315, #316,
  #320, #322 to #327.
- SurveyMonkey/skills: ADR 012, #215.
- sm-incubator/org-claude: #102, #104.
- Docs: [Host and maintain a marketplace](https://code.claude.com/docs/en/plugins/host-marketplace),
  [Create a marketplace](https://code.claude.com/docs/en/plugins/create-marketplace).
