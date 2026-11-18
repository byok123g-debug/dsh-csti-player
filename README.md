# dsh-plugins

Two [DeepSeek Harness](https://github.com/deepseek-ai) bundles. Both are plain ES-module Host plugins: no build step, no runtime dependencies.

| Package | What it does |
|---|---|
| [`packages/dsh-frugal`](packages/dsh-frugal) | Always-on token discipline: caps reply length, budgets screenshots per turn, and injects a cached coordinate sheet so repeated UI lookups cost no image tokens. |
| [`packages/csti-deepseek-player`](packages/csti-deepseek-player) | Gives the agent eyes and hands inside *Card Survival: Tropical Island* through a local game mod bridge (Windows). |

## Install

Clone the repo, then in DeepSeek Harness open **Plugins → Add plugin** and point it at the package directory, or from this checkout:

```bash
dsh plugin add ./packages/dsh-frugal
```

Each package is a DSH bundle: installing it links the directory, so later edits in this repo take effect after a plugin toggle or a restart.

## Requirements

- DeepSeek Harness Desktop (the bundles use the Host plugin API).
- `csti-deepseek-player` additionally needs Windows and a modded copy of *Card Survival: Tropical Island* exposing a local control bridge; see its README for the exact game/mod setup.

## License

MIT — see [LICENSE](LICENSE). Contributions welcome; please keep each package free of machine-specific paths and secrets.
