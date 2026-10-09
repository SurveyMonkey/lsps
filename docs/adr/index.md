---
okf_version: "0.2"
---

# ADR index

| Doc | Description |
|-----|-------------|
| [001-typescript-toolchain.md](001-typescript-toolchain.md) | Plugin code is TypeScript run directly by node 22.18 or newer, with no build step. Plugins share one root `lib/` through a committed symlink and ship only run-time files. Tests live under `tests/`. Local hooks are staged-only; CI runs everything, with coverage at 100. |
