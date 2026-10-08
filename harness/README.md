# harness

The shared test harness. Tests import it through `#harness/*`. No plugin file imports it, so it
never ships.

| File | What it gives a test |
| --- | --- |
| `paths.ts` | `ROOT`, and `pluginFile(plugin, ...parts)` for a test that runs a plugin's script or hook as a process. |
| `sandbox.ts` | A private temp directory with a `HOME` inside it, an `env` for children, and `pathWithout` to hide a tool from `PATH`. |
| `spawn.ts` | `runScript` (run to completion, both streams drained) and `startScript` (a child still running, for stream tests). |

`tests/harness/` asserts each file's own claims, so a test built on the harness cannot pass for
the wrong reason.
