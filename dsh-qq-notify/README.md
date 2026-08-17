# dsh-qq-notify

QQ notification channel for DeepSeek Harness (DSH), powered by a local [NapCat](https://github.com/NapNeko/NapCatQQ) bot.

Registers three model-facing tools:

| Tool | What it does |
|---|---|
| `qq_send` | Send a private QQ message to your main account (default `940841288`) via OneBot HTTP API `127.0.0.1:3002`. Zero-search, native tool call — say "用QQ发：…" and the model sends it directly. |
| `qq_status` | Check whether NapCat is running and which bot account is logged in. |
| `qq_napcat` | Start / stop / restart / status of the NapCat bot (hidden-window launch, delegates to `qq.ps1`). |

## Requirements

- Windows 10/11 x64, local NapCat deployment (see `DEPLOY.md` in the parent project).
- OneBot HTTP API on `127.0.0.1:3002` (default config of this deployment; 3000/3001 are taken by Docker on this machine).
- Bot account `3053818342` logged in; your main account must have added the bot as a friend.

## Configuration

Three channels, highest wins (host composition config > `qq-notify.config.json` > built-in defaults):

| Key | Default | Meaning |
|---|---|---|
| `mainQq` | `940841288` | Your main account that receives notifications |
| `apiPort` | `3002` | NapCat OneBot HTTP API port |
| `napcatDir` | `D:\Project\qq-remote-deploy\napcat` | NapCat deployment directory (managed by `qq_napcat`) |
| `botQq` | `""` (auto-detect) | Optional bot account override |

- **User-friendly**: edit `qq-notify.config.json` in the deployment directory (created on install, reloads on DSH restart).
- **Host composition**: override in `cordis.patch.yml` under the plugin's `config:`.

## Install (profile bundle)

From the plugin checkout (or any directory, with a relative path):

```bash
dsh plugin --profile web add file:D:/Project/qq-remote-deploy/dsh-qq-notify
# or, without the dsh CLI, inside the profile directory:
#   pnpm add file:D:/Project/qq-remote-deploy/dsh-qq-notify
```

The `dsh.bundle.patch` declaration makes the profile reconciler add `dsh-qq-notify` to the layer stack automatically. Restart DSH, then any session can call the three tools directly.

## Development

```bash
node --check lib/index.js
# simulate cordis load + tool registration + execute:
node --input-type=module -e "const m = await import('dsh-qq-notify'); const r=[]; const ctx={tools:{register:t=>r.push(t)}}; m.apply(ctx); console.log(r.map(t=>t.name));"
```

## Publish to the community market (optional)

1. Push this package to a public GitHub repo.
2. Open a PR to the [awesome-dsh-plugin registry](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) adding an entry:
   `{ "name": "dsh-qq-notify", "owner": "<you>", "url": "<repo>", "category": "notify", "description": { "en": "...", "zh": "..." }, "npm": null, "install": "dsh plugin --profile web add github:<you>/dsh-qq-notify" }`
3. It then appears in the in-app plugin market under *Notifications & Integrations*.

## Security

- NapCat HTTP/WebUI bind to `127.0.0.1` only; do not expose them publicly.
- The bot account carries the protocol risk; your main account only receives.
