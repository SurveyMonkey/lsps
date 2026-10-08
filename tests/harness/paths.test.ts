// The paths that `harness/paths.ts` gives are real places in this repository.
import { existsSync } from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'
import { pluginFile, ROOT } from '#harness/paths.ts'

it('names the repository root', () => {
  expect(existsSync(path.join(ROOT, 'package.json'))).toBe(true)
  expect(existsSync(path.join(ROOT, 'lib'))).toBe(true)
})

it('names a file inside a plugin, under plugins/ at the root', () => {
  expect(pluginFile('lsp-merge', 'scripts', 'lsp-merge.ts')).toBe(
    path.join(ROOT, 'plugins', 'lsp-merge', 'scripts', 'lsp-merge.ts'),
  )
})
