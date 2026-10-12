// Shared helpers for the repository layout test (`repo-layout.test.ts`) and
// the labeler test (`labeler.test.ts`). `root` is a parameter on the walking
// functions, not a hardcoded global. So a test can run a rule against a
// synthetic temporary tree, as well as against the real one.
import { type Dirent, existsSync, readdirSync, readFileSync, readlinkSync, statSync } from 'node:fs'
import path from 'node:path'

export const ROOT = path.resolve(import.meta.dirname, '..', '..')
export const PLUGINS = path.join(ROOT, 'plugins')
export const LIB = path.join(ROOT, 'lib')

// Directories directly under `root` (PLUGINS by default) that carry a
// manifest. A
// directory without .claude-plugin/ is not a plugin. A directory whose
// .claude-plugin entry exists, but is not itself a directory (a stray file
// with that name), is not one either. `root` is a parameter, defaulted to
// PLUGINS, so a test can run the filter against a synthetic tree, as well
// as the real one.
export function pluginDirs(root: string = PLUGINS): string[] {
  const dirs: string[] = []
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const full = path.join(root, entry.name)
    const manifestDir = path.join(full, '.claude-plugin')
    if (existsSync(manifestDir) && statSync(manifestDir).isDirectory()) {
      dirs.push(full)
    }
  }
  return dirs.sort()
}

export function rel(p: string): string {
  return path.relative(ROOT, p)
}

// The symlink every plugin that needs the root lib carries, written
// exactly as it must appear: `plugins/<p>/src/lib -> ../../../lib` (ADR
// 001). This compares the target as a string, not
// resolved, because Claude Code's installer classifies the string itself.
// A link into the same marketplace is dereferenced into the cache copy,
// and a link that resolves outside it is skipped. A second spelling that
// happens to resolve to the same directory would install differently.
export const LIB_LINK_TARGET = path.join('..', '..', '..', 'lib')

// Relative import specifiers, read lexically, not parsed. Node has no
// parser in its standard library, and the dependency rule says this
// repository's own tooling takes none. The trade is deliberate: a specifier written
// inside a comment or a string reads as an import here. That is a false
// positive a contributor can see and rephrase. A parser-shaped miss would
// instead be a rule that silently stopped holding.
//
// This regex has all three delimiters, with a backreference so the
// closing one matches the opening one. A template literal is how
// `await import(`...`)` is often written, and a check of only the two
// quote characters would be exactly the parser-shaped miss the paragraph
// above warns against. `require` is in the alternation for the same
// reason: reached through `createRequire`, it loads a module out of the
// plugin exactly as `import` does. `\b` keeps `createRequire` itself out.
// `import.meta.resolve` and `new URL(..., import.meta.url)` stay out on
// purpose, since they compute a path and load nothing, and no lexical
// rule can follow path arithmetic.
const IMPORT = /\b(?:from|import|require)\s*\(?\s*(['"`])([^'"`]+)\1/g

// Every import specifier in `file` that starts with `prefix`.
function importsStartingWith(file: string, prefix: string): string[] {
  const found: string[] = []
  for (const match of readFileSync(file, 'utf8').matchAll(IMPORT)) {
    // Two mandatory capturing groups in a matching regular expression always
    // populate both positions; the cast is erased and adds no branch.
    const specifier = match[2] as string
    if (specifier.startsWith(prefix)) found.push(specifier)
  }
  return found
}

// A bare specifier such as `node:fs` or a dev dependency cannot reach
// across a plugin boundary. A `#` specifier can: `packageImports` below
// refuses it.
const relativeImports = (file: string): string[] => importsStartingWith(file, '.')

// Every `.ts` file under `dir`, at any depth. This function neither
// descends into a symlink nor collects it. `src/lib` is a directory of
// the root lib's files, and a walk into it would report the shared
// library's own imports as the plugin's.
function tsFilesUnder(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      found.push(...tsFilesUnder(full))
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      found.push(full)
    }
  }
  return found.sort()
}

function isInside(dir: string, target: string): boolean {
  return target.startsWith(dir + path.sep)
}

// The one entry named `name` directly inside `dir`, or undefined. This
// reads from a directory listing, instead of a stat call on the path. So
// a link whose target does not exist is still visible. A wrong symlink
// target is exactly what this function checks for, and an existence test
// would skip the very case it exists to catch.
function childEntry(dir: string, name: string): Dirent | undefined {
  return readdirSync(dir, { withFileTypes: true }).find((entry) => entry.name === name)
}

/**
 * Relative imports that leave the plugin they are written in.
 *
 * ADR 001: the `src/lib` symlink is the only path out of a plugin, and
 * nothing else imports across a plugin boundary. An import through
 * `src/lib` passes without a special case, because the link is a
 * directory inside the plugin, and the specifier resolves inside it. An
 * import that reaches the root `lib/` by `../../../lib` does not pass;
 * that is the point, since the installed copy of a plugin has no such
 * path.
 *
 * No file in a plugin may import `harness/`, a test file included. Tests
 * live under `tests/`, outside every plugin (ADR 001), and the harness
 * never ships.
 *
 * `root` is a parameter, defaulted to PLUGINS, so a test can run the rule
 * against synthetic trees, as well as against the real one. Some arms stay
 * empty against the real tree, and only a synthetic tree runs them.
 */
export function crossPluginImports(root: string = PLUGINS): string[] {
  const violations: string[] = []
  for (const plugin of pluginDirs(root)) {
    for (const file of tsFilesUnder(plugin)) {
      const where = path.relative(root, file)
      for (const specifier of relativeImports(file)) {
        const resolved = path.resolve(path.dirname(file), specifier)
        if (isInside(plugin, resolved)) continue
        violations.push(`${where}: imports ${specifier}, which resolves outside the plugin`)
      }
    }
  }
  return violations.sort()
}

/**
 * `#` imports in a file that ships.
 *
 * The `imports` map in the root `package.json` gives the tests short
 * names, such as `#lib/*` and `#harness/*`. Node, `tsc` and vitest all
 * read that map in this checkout, so such an import in a plugin passes
 * the type check and every test that runs it. An installed plugin has no
 * `package.json` above it, so node refuses the import there (ADR 001).
 * This rule reads every `.ts` file under each root, `lib/` included,
 * because `lib/` ships through `src/lib`.
 *
 * `roots` is a parameter, so a test can run the rule against a synthetic
 * tree. Each report names the path relative to the parent of its root.
 */
export function packageImports(roots: readonly string[] = [PLUGINS, LIB]): string[] {
  const violations: string[] = []
  for (const root of roots) {
    for (const file of tsFilesUnder(root)) {
      const where = path.relative(path.dirname(root), file)
      for (const specifier of importsStartingWith(file, '#')) {
        violations.push(`${where}: imports ${specifier}, which only this checkout resolves`)
      }
    }
  }
  return violations.sort()
}

/**
 * Every `plugins/<p>/src/lib` that is not the committed symlink.
 *
 * A plugin with no `src/lib` is not a violation. A plugin needs the root
 * lib only when it imports it. A plugin that has one must reach it the way
 * the installer understands. A real directory there would be a second
 * copy of the shared library. Any other link target is the case the
 * three-way rule skips, rather than dereferences (ADR 001).
 */
export function libLinkViolations(root: string = PLUGINS): string[] {
  const violations: string[] = []
  for (const plugin of pluginDirs(root)) {
    const where = path.relative(root, plugin)
    // This call follows the link, instead of reading it from the listing.
    // This is the one place in this file that wants `stat` semantics. A
    // `src` that is itself a symlink must be followed through, since a
    // skip would let a plugin hide a real copy of the shared library one
    // link away from where the rule looks. A listing entry answers from
    // `lstat`, and would report such a `src` as neither a directory nor a
    // file.
    //
    // Once followed, anything that is not a directory, including a link
    // that points at nothing or at a file, is the same "no src here" as a
    // plugin that has none. A call to `readdirSync` on it would abort the
    // whole rule with an fs error, instead of a clean report.
    if (statSync(path.join(plugin, 'src'), { throwIfNoEntry: false })?.isDirectory() !== true) {
      continue
    }
    const lib = childEntry(path.join(plugin, 'src'), 'lib')
    if (lib === undefined) continue
    if (!lib.isSymbolicLink()) {
      violations.push(`${where}/src/lib is not a symlink`)
      continue
    }
    const target = readlinkSync(path.join(plugin, 'src', 'lib'))
    if (target !== LIB_LINK_TARGET) {
      violations.push(`${where}/src/lib points at ${target}, not ${LIB_LINK_TARGET}`)
    }
  }
  return violations.sort()
}

/**
 * Every plugin that carries a top-level `bin/` directory.
 *
 * claude.ai refuses such a plugin outright, by marketplace sync and by
 * direct upload alike. So one `bin/` makes the plugin undistributable
 * through organization settings. The directory is also added to the Bash
 * tool's `PATH` while the plugin is enabled. The entry point lives in
 * `scripts/` instead (`.claude/rules/type-ts.md`).
 *
 * This is the rule here whose failure mode sits furthest from a red test.
 * A reintroduced `bin/` breaks nothing in this repository. It is refused
 * later, on a machine that is not this one, by a service no test can ask.
 *
 * This follows the link, instead of reading it from the listing, for the
 * reason `libLinkViolations` gives above. A link to a directory is
 * dereferenced into the cache copy and installs as a directory, so it is
 * the same violation. A link that points at nothing or at a file is not
 * one.
 */
export function binDirectories(root: string = PLUGINS): string[] {
  const violations: string[] = []
  for (const plugin of pluginDirs(root)) {
    if (statSync(path.join(plugin, 'bin'), { throwIfNoEntry: false })?.isDirectory() !== true) {
      continue
    }
    violations.push(`${path.relative(root, plugin)}/bin is a directory, and claude.ai refuses one`)
  }
  return violations.sort()
}

// Every directory under `dir`, at any depth, as a path relative to `dir`.
// This walk does not go into a symlink. `src/lib` is the root `lib/`, and
// the guards below check `lib/` at its real path. But the installer copies
// a linked directory as a real one, so a symlink to a directory is in the
// list by its own name. Then a guard can refuse a link named `fixtures` or
// `commands`.
function directoriesUnder(dir: string, prefix = ''): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    const relative = path.join(prefix, entry.name)
    if (entry.isDirectory()) {
      found.push(relative, ...directoriesUnder(full, relative))
    } else if (
      entry.isSymbolicLink() &&
      statSync(full, { throwIfNoEntry: false })?.isDirectory() === true
    ) {
      found.push(relative)
    }
  }
  return found
}

// Every file under `dir`, at any depth, as a path relative to `dir`. This
// walk does not go into a symlink either. It lists each link as one file,
// by its own name, so a test file inside a linked directory is not seen.
function filesUnder(dir: string, prefix = ''): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relative = path.join(prefix, entry.name)
    if (entry.isDirectory()) found.push(...filesUnder(path.join(dir, entry.name), relative))
    else found.push(relative)
  }
  return found
}

/**
 * Test files, test helpers and fixtures inside a plugin or inside `lib/`.
 *
 * Claude Code copies a plugin's whole directory into each user's cache at
 * install. It also copies `lib/`, through the `src/lib` symlink. It has no
 * way to leave a file out. So a file here ships to every user (ADR 001).
 * Tests, their helpers and their fixtures live under `tests/` instead.
 *
 * `roots` is a parameter, so a test can run the rule against a synthetic
 * tree. Each report names the path relative to the parent of its root.
 */
export function developmentFiles(roots: readonly string[] = [PLUGINS, LIB]): string[] {
  const violations: string[] = []
  for (const root of roots) {
    const name = path.basename(root)
    for (const dir of directoriesUnder(root)) {
      if (path.basename(dir) === 'fixtures') {
        violations.push(`${path.join(name, dir)} is a fixtures directory, and it would ship`)
      }
    }
    for (const file of filesUnder(root)) {
      if (file.endsWith('.test.ts') || file.endsWith('.test-support.ts')) {
        violations.push(`${path.join(name, file)} is test code, and it would ship`)
      }
    }
  }
  return violations.sort()
}

// The paths below the repository root that `testsOutsideTests` does not
// walk: other checkouts of this repository, git's own store, and `tests/`,
// where a test belongs.
const NOT_WALKED = [path.join('.claude', 'worktrees'), '.git', 'tests']

// Every file under `dir`, as a path relative to `top`. This walk skips
// NOT_WALKED, and a `node_modules` directory at any depth. It does not go
// into a symlink, for the reason `directoriesUnder` gives.
function repositoryFiles(top: string, dir: string = top): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relative = path.relative(top, path.join(dir, entry.name))
    if (NOT_WALKED.includes(relative) || entry.name === 'node_modules') continue
    if (entry.isDirectory()) found.push(...repositoryFiles(top, path.join(dir, entry.name)))
    else found.push(relative)
  }
  return found
}

/**
 * Test files and test helpers outside `tests/`.
 *
 * vitest collects only the `.test.ts` files under `tests/`. So a test
 * file in any other place never runs, and no test fails. A test helper
 * goes beside the tests that use it. `developmentFiles` refuses both in a
 * plugin or in `lib/`, because they would ship. This rule refuses them in
 * every other place too, for example `harness/` or the repository root
 * (ADR 001).
 *
 * `root` is a parameter, so a test can run the rule against a synthetic
 * tree. Each report names the path relative to `root`.
 */
export function testsOutsideTests(root: string = ROOT): string[] {
  const violations: string[] = []
  for (const file of repositoryFiles(root)) {
    if (file.endsWith('.test.ts') || file.endsWith('.test-support.ts')) {
      violations.push(`${file} is test code outside tests/`)
    }
  }
  return violations.sort()
}

/** The directory names Claude Code gives a meaning to at a plugin's root
 *  (plugins-reference, "Standard layout"; `evals/` is the default of
 *  `experimental.evals`). */
export const RESERVED_DIRECTORIES: readonly string[] = [
  'agents',
  'bin',
  'commands',
  'evals',
  'hooks',
  'monitors',
  'output-styles',
  'skills',
  'themes',
  'workflows',
]

/**
 * Directories that use the name of a plugin component but are not that
 * component (ADR 001).
 *
 * Below the plugin root, no directory may take a reserved name: it would
 * read as a component that Claude Code does not load. At the root,
 * `commands/` is refused too, because new plugins use `skills/` (the
 * docs call `commands/` the legacy form). `binDirectories` refuses a root
 * `bin/` for its own reason.
 */
export function reservedDirectoryNames(root: string = PLUGINS): string[] {
  const violations: string[] = []
  for (const plugin of pluginDirs(root)) {
    const where = path.relative(root, plugin)
    for (const dir of directoriesUnder(plugin)) {
      const name = path.basename(dir)
      if (!RESERVED_DIRECTORIES.includes(name)) continue
      if (dir === 'commands') {
        violations.push(`${where}/commands is the legacy component; use skills/`)
      } else if (dir !== name) {
        violations.push(`${path.join(where, dir)} uses the name of a plugin component`)
      }
    }
  }
  return violations.sort()
}
