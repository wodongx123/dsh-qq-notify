# Changelog

All notable changes to dsh-qq-notify are documented in this file.

## [1.0.0] — 2026-08-27

### Added

- `qq_send` — send a private QQ message to the user's main account via the local NapCat OneBot HTTP API.
- `qq_status` — check NapCat installation status and HTTP API connectivity.
- `qq_napcat` — manage the local NapCat lifecycle (`start` / `stop` / `status`) directly through `launcher.bat`.
- `qq_detect` / `qq_find` — validate a directory as a NapCat deployment, or auto-scan the machine for instances.
- `qq_config_show` / `qq_config_set` — view and persist plugin configuration to `napcat/qq-notify.config.json`.
- `qq_deploy` — step-by-step NapCat Shell install guide.
- WebUI panel with live status, start/stop controls and a collapsible install guide (hidden by default).
- Web routes: `/dsh-qq-notify/status`, `/config`, `/napcat`, `/find`, `/test`, `/confirm` (loopback-only).

### Changed

- NapCat detection: process-level `tasklist` check with HTTP endpoint fallback.
- Startup goes through `launcher.bat` (same as double-clicking) instead of a hidden VBS window.
- Removed the restart button from the WebUI; `qq_napcat` actions are now `start`/`stop`/`status` only.
- The `mainQq` config now defaults to an empty string (no hard-coded QQ number).

## [0.1.0] — 2026-08-17

### Added

- Initial plugin skeleton: `qq_send` / `qq_status` tools, config schema and WebUI entry.