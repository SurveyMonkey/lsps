---
okf_version: "0.2"
---

# ADR index

| Doc | Description |
|-----|-------------|
| [001-typescript-toolchain.md](001-typescript-toolchain.md) | Plugin code is TypeScript run directly by node 22.18 or newer, with no build step. Plugins share one root `lib/` through a committed symlink and ship only run-time files. Tests live under `tests/`. Local hooks are staged-only; CI runs everything, with coverage at 100. |
| [002-lsp-merge-proxy.md](002-lsp-merge-proxy.md) | The lsp-merge plugin is one language server that runs the servers in a repository's .claude/lsp-merge.json and joins them. Requests go to one primary child for each file. Diagnostics from all children are merged, with pulls for children that only answer pulls. It is the one plugin here that runs as a long-lived process. |
