@echo off
setlocal EnableDelayedExpansion
set "QQ_DIR=%~dp0"

rem ---------- 无参数（双击）: 交互发送 ----------
if "%~1"=="" (
  echo ===== QQ 通知通道 =====
  echo 输入要发送的消息，回车即发送（直接回车取消）:
  set /p "QQ_MSG=> "
  if "!QQ_MSG!"=="" exit /b
  powershell -NoProfile -ExecutionPolicy Bypass -File "%QQ_DIR%qq.ps1" send
  exit /b
)

set "QQ_CMD=%~1"
set "QQ_MSG=%~2"

if /i "%QQ_CMD%"=="send" (
  if "%QQ_MSG%"=="" (
    echo 输入要发送的消息:
    set /p "QQ_MSG=> "
  )
  powershell -NoProfile -ExecutionPolicy Bypass -File "%QQ_DIR%qq.ps1" send
  goto :eof
)
if /i "%QQ_CMD%"=="start"    powershell -NoProfile -ExecutionPolicy Bypass -File "%QQ_DIR%qq.ps1" start   & goto :eof
if /i "%QQ_CMD%"=="stop"     powershell -NoProfile -ExecutionPolicy Bypass -File "%QQ_DIR%qq.ps1" stop    & goto :eof
if /i "%QQ_CMD%"=="status"   powershell -NoProfile -ExecutionPolicy Bypass -File "%QQ_DIR%qq.ps1" status  & goto :eof
if /i "%QQ_CMD%"=="logs"    powershell -NoProfile -ExecutionPolicy Bypass -File "%QQ_DIR%qq.ps1" logs   & goto :eof
if /i "%QQ_CMD%"=="install"  powershell -NoProfile -ExecutionPolicy Bypass -File "%QQ_DIR%qq.ps1" install & goto :eof
if /i "%QQ_CMD%"=="autostart" powershell -NoProfile -ExecutionPolicy Bypass -File "%QQ_DIR%qq.ps1" autostart "%QQ_MSG%" & goto :eof
if /i "%QQ_CMD%"=="help"     powershell -NoProfile -ExecutionPolicy Bypass -File "%QQ_DIR%qq.ps1" help    & goto :eof

echo 未知命令: %QQ_CMD%   （可用: send / start / stop / status / autostart on^|off / install / help）
pause
goto :eof