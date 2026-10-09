# lsps

Claude Code plugin marketplace for language server plugins. Each plugin runs a language server
from the project's own `node_modules`, so Claude sees the same diagnostics the toolchain gives.

```text
/plugin marketplace add SurveyMonkey/lsps
/plugin install <plugin>@lsps
```

## Plugins

None yet. [RFC 001](docs/rfc/001-lsp-marketplace.md) is the plan: `lsp-merge`, `typescript7-lsp`
and `biome-lsp` land next.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Decisions live in [docs/](docs/index.md).
