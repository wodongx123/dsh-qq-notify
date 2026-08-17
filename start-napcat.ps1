# start-napcat.ps1 —— 启动 NapCat（QQ 通知通道）
# 用法:
#   .\start-napcat.ps1             # 隐藏窗口后台启动（默认，推荐）
#   .\start-napcat.ps1 -NoHide     # 前台窗口启动（调试用，日志直接显示）
# 说明:
#   - 默认走 qq.ps1 start：VBS 完全隐藏窗口，日志写入 napcat\napcat-console.log
#   - 登录状态持久化后自动快速登录（-q <QQ>），免扫码
#   - HTTP API 端口: 127.0.0.1:3002（3000/3001 被本机 Docker 占用）
#   - WebUI: http://127.0.0.1:6099/webui?token=<见 webui.json>
# 停止: qq stop 或任务管理器结束 node.exe 进程树

param(
  [switch]$NoHide = $false  # 前台窗口运行（调试）
)

$ErrorActionPreference = "Stop"
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path

if ($NoHide) {
  # 前台调试模式
  $base = Join-Path $dir "napcat"
  Set-Location $base
  $acct = Get-ChildItem "$base\napcat\config\napcat_*.json" -ErrorAction SilentlyContinue |
          ForEach-Object { if ($_.BaseName -match 'napcat_(\d+)$') { $matches[1] } } | Select-Object -First 1
  $args = @("index.js")
  if ($acct) { $args += @("-q", $acct) }
  Write-Host "启动 NapCat（前台）: node.exe $($args -join ' ')"
  & "$base\node.exe" @args
  exit
}

# 默认隐藏启动
& (Join-Path $dir "qq.ps1") start
