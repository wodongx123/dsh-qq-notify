# dsh-qq-notify —— QQ 通知插件

Send QQ private-message notifications via a local NapCat bot. **6 DSH tools with built-in deployment engine**, standalone HTML console for offline use.

## Usage

### ① Standalone web console (zero dependencies)

Open `qq-panel.html` in your browser:

- Channel status (NapCat online/offline, bot account)
- Message box → "Send"
- NapCat start / stop / restart buttons

Works without DSH — connects directly to the local NapCat API.

### ② DSH conversation (6 tools)

| You say | Effect |
|---|---|
| "send QQ: task done" | Auto-send via napcat |
| "set up QQ notify for me" | **Built-in engine: download → extract → fix → guide login** |
| "show current QQ config" | Display all configuration |
| "change my main QQ to xxx" | Update and save to disk |
| "check QQ channel status" | Is NapCat online? |
| "start/restart QQ notify" | Background manage NapCat |

### ③ Command line

```bat
qq send "msg"    qq status    qq start / stop / restart / logs    qq autostart on
```

## New machine — one command

Say `set up QQ notify for me` in DSH — the model calls the built-in deployment engine to:
- Download latest NapCat Shell from GitHub Releases
- Extract and install locally
- Apply bug fixes
- Guide you through QR code login (the only manual step needed)

## Install

```bash
dsh plugin --profile web add file:<this-dir>
```

Restart DSH. Requires Windows 10/11 x64, a logged-in bot account, and the bot must be friends with your main account.
