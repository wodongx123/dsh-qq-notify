# dsh-qq-notify

Send QQ private-message notifications to your main account via a local NapCat bot. Four native DSH tools + a **web console** mounted on the DSH web server (no extra port).

## Usage

### ① Web console

Append `/qq-panel` to the DSH web URL (e.g. `http://127.0.0.1:52364/qq-panel`):

- Channel status (NapCat online/offline, bot account)
- Message box → "Send"
- NapCat start / stop / restart buttons

### ② Just talk to the model (tools are auto-loaded)

| You say | Tool | Effect |
|---|---|---|
| "send QQ: task done" | qq_send | Send to main account |
| "check QQ channel status" | qq_status | NapCat online? bot account? |
| "start/restart QQ notify" | qq_napcat | Manage NapCat |
| "set up QQ notify for me" | qq_deploy | Auto-download & deploy NapCat |

### ③ Command line (no plugin needed)

```bat
qq send "msg"    qq status    qq start / stop / restart / logs
```

## Config

Edit `qq-notify.config.json` next to the deployment (effective after DSH restart):

```json
{
  "mainQq": "940841288",
  "apiPort": 3002,
  "napcatDir": "D:\\...\\napcat",
  "webPanelEnabled": true
}
```

> The plugin itself needs no port (tools call NapCat in-process; the web console is mounted at `/qq-panel` on the DSH web server).

## Install

```bash
dsh plugin --profile web add file:<this-dir>
```

Restart DSH. Requires Windows 10/11 x64, a deployed NapCat (qq_deploy can install it), a logged-in bot account whose friend list includes your main account.
