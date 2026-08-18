# dsh-qq-notify

Send QQ private-message notifications to your main account via a local NapCat bot. Six native DSH tools + a **standalone HTML console**.

## Usage

### ① Standalone web console (zero dependencies)

Open `qq-panel.html` in your browser — no server, no extra port:

- Channel status (NapCat online/offline, bot account)
- Message box → "Send"
- NapCat start / stop / restart buttons

### ② Just talk to the model (6 tools auto-loaded)

| You say | Effect |
|---|---|
| "send QQ: task done" | Send to main account |
| "show current QQ config" | Display all configuration |
| "change my main QQ to xxx" | Update and save config |
| "check QQ channel status" | Is NapCat online? |
| "start/restart QQ notify" | Manage NapCat |
| "set up QQ notify for me" | Auto-download & deploy NapCat |

### ③ Command line (no plugin needed)

```bat
qq send "msg"    qq status    qq start / stop / restart / logs    qq autostart on
```

## Install

```bash
dsh plugin --profile web add file:<this-dir>
```

Restart DSH. A fresh machine needs QQ installed first (provides encryption DLLs), then say "set up QQ notify for me" to walk through everything end-to-end.
