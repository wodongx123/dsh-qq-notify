# qq.ps1 —— QQ 通知通道统一管理（被 qq.cmd 调用，也可直接 PowerShell 使用）
# 用法:
#   .\qq.ps1 send "消息内容"     # 发 QQ 通知（默认发到主号 940841288）
#   .\qq.ps1 send                 # 交互式输入消息
#   .\qq.ps1 start                # 启动 NapCat（后台最小化窗口，自动快速登录）
#   .\qq.ps1 stop                 # 停止 NapCat
#   .\qq.ps1 status               # 健康检查
#   .\qq.ps1 autostart on|off     # 开机自启开关
#   .\qq.ps1 install              # 把本目录加入用户 PATH（任意目录可调用）
#   .\qq.ps1 help                 # 帮助

param([string]$Action = "help", [string]$Msg = "")

$ErrorActionPreference = "Stop"
$QQ_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$NAP_DIR = Join-Path $QQ_DIR "napcat"
$PID_FILE = Join-Path $QQ_DIR ".napcat.pid"

function Get-BotAccount {
  # 从 napcat_<QQ>.json 检测已登录账号
  Get-ChildItem (Join-Path $NAP_DIR "napcat\config\napcat_*.json") -ErrorAction SilentlyContinue |
    ForEach-Object { if ($_.BaseName -match '^napcat_(\d+)$') { $matches[1] } } |
    Select-Object -First 1
}

function Get-ListeningPids([int]$Port) {
  # netstat 解析监听端口 -> PID 列表（Get-NetTCPConnection 在部分环境不可用）
  $pids = @()
  $lines = netstat -ano 2>$null | Select-String ":$Port\s" | Where-Object { $_.Line -match 'LISTENING' }
  foreach ($line in $lines) {
    $parts = ($line.ToString() -split '\s+') | Where-Object { $_ }
    if ($parts.Count -ge 5 -and $parts[-1] -match '^\d+$') { $pids += [int]$parts[-1] }
  }
  $pids | Sort-Object -Unique
}

function Send-Notice {
  $msg = $Msg
  if (-not $msg) { $msg = $env:QQ_MSG }
  if (-not $msg) { $msg = Read-Host "请输入要发送的消息" }
  if (-not $msg) { Write-Host "已取消（消息为空）"; return }
  & (Join-Path $QQ_DIR "qq-notify.ps1") -Message $msg
}

function Start-NapCat {
  if (Get-ListeningPids 6099) {
    Write-Host "NapCat 已在运行（WebUI 6099 监听中）"
    return
  }
  $nodeExe = Join-Path $NAP_DIR "node.exe"
  if (-not (Test-Path $nodeExe)) { Write-Error "未找到 $nodeExe"; exit 1 }
  $acct = Get-BotAccount
  $args = @("index.js")
  if ($acct) { $args += @("-q", $acct); Write-Host "快速登录账号: $acct" }

  # 完全隐藏启动：VBS + cmd /c + 日志重定向（无窗口、无任务栏图标）
  # 路径均无空格，命令行无需引号，避免 cmd 引号转义问题
  $logOut = Join-Path $NAP_DIR "napcat-console.log"
  $logErr = Join-Path $NAP_DIR "napcat-console.err.log"
  # PowerShell 字符串里 "" 生成一个 " 字符；VBS 需要 ""（两个字符）表示一个字面引号，
  # 因此这里用 """"（四引号）生成两个 " 字符写进 VBS
  # 工作目录通过 ws.CurrentDirectory 设置（cmd /c 直接跑 node.exe，避免 MODULE_NOT_FOUND）
  $cmdLine = "cmd /c node.exe $($args -join ' ') > """"$logOut"""" 2> """"$logErr"""""
  $vbs = Join-Path $QQ_DIR ".napcat-launch.vbs"
  $vbsContent = "Set ws = CreateObject(""Wscript.Shell"")`r`n" +
                "ws.CurrentDirectory = ""$NAP_DIR""`r`n" +
                "ws.Run ""$cmdLine"", 0, False`r`n"
  [System.IO.File]::WriteAllText($vbs, $vbsContent, [System.Text.Encoding]::GetEncoding(936))
  Start-Process wscript.exe -ArgumentList ('"' + $vbs + '"') -WindowStyle Hidden | Out-Null
  # 保留 VBS 文件（隐藏文件，下次启动覆盖），避免 wscript 尚未读取就被删除

  # 等待端口起来，并记录主进程 PID（供 stop 使用）
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 1
    if (Get-ListeningPids 6099) { break }
  }
  try {
    $main = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -match 'index\.js' } | Select-Object -First 1
    if ($main) { $main.ProcessId | Set-Content $PID_FILE -Encoding ASCII }
  } catch { }
  Write-Host "NapCat 已在后台启动（窗口完全隐藏，无任务栏图标）。"
  Write-Host "日志: napcat\napcat-console.log | 状态: qq status | 发送: qq send"
}

function Stop-NapCat {
  $ids = @()
  if (Test-Path $PID_FILE) {
    $ids += (Get-Content $PID_FILE | ForEach-Object { [int]$_ })
  }
  # 主进程: CommandLine 含 index.js 的 node.exe（杀它可连 worker 一起停）
  try {
    $main = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
            Where-Object { $_.CommandLine -match 'index\.js' } | Select-Object -First 1
    if ($main) { $ids += [int]$main.ProcessId }
  } catch { }
  $ids += Get-ListeningPids 6099
  $ids += Get-ListeningPids 3002
  $ids = $ids | Sort-Object -Unique
  if (-not $ids) { Write-Host "NapCat 未在运行"; return }
  foreach ($id in $ids) {
    Write-Host "停止进程树 PID $id ..."
    taskkill /PID $id /T /F 2>$null | Out-Null
  }
  Remove-Item $PID_FILE -ErrorAction SilentlyContinue
  # 轮询等待端口释放（NapCat 主进程被杀后 worker 会自动退出）
  for ($i = 0; $i -lt 10; $i++) {
    Start-Sleep -Seconds 1
    if (-not (Get-ListeningPids 6099) -and -not (Get-ListeningPids 3002)) { break }
  }
  Write-Host "NapCat 已停止"
}

function Show-Status {
  Write-Host "===== QQ 通知通道状态 ====="
  $apiPids = Get-ListeningPids 3002
  $webPids = Get-ListeningPids 6099
  if ($apiPids) { Write-Host "[OK] HTTP API 3002 监听中 (PID $($apiPids -join ','))" } else { Write-Host "[FAIL] HTTP API 3002 未监听" }
  if ($webPids) { Write-Host "[OK] WebUI 6099 监听中 (PID $($webPids -join ','))" } else { Write-Host "[FAIL] WebUI 6099 未监听" }
  if ($apiPids) {
    try {
      $r = Invoke-RestMethod -Uri "http://127.0.0.1:3002/get_login_info" -Method Get -TimeoutSec 5
      Write-Host "[OK] 已登录机器人: $($r.data.user_id) ($($r.data.nickname))"
    } catch {
      Write-Host "[FAIL] API 无响应: $($_.Exception.Message)"
    }
  }
  $acct = Get-BotAccount
  if ($acct) { Write-Host "已保存快速登录账号: $acct" } else { Write-Host "无快速登录账号（首次需扫码）" }
  $startup = Get-ChildItem (Join-Path ([Environment]::GetFolderPath('Startup')) "QQ-NapCat*.cmd") -ErrorAction SilentlyContinue
  if ($startup) { Write-Host "开机自启: 已启用" } else { Write-Host "开机自启: 未启用 (qq autostart on)" }
  if ($env:Path -match [regex]::Escape($QQ_DIR)) { Write-Host "PATH 全局调用: 已启用" } else { Write-Host "PATH 全局调用: 未启用 (qq install)" }
}

function Set-Autostart {
  $on = $Msg.ToLower()
  $link = Join-Path ([Environment]::GetFolderPath('Startup')) "QQ-NapCat-通知通道.cmd"
  if ($on -eq "on") {
    # 隐藏窗口方式自启（qq.ps1 start 内部为 VBS 隐藏启动）
    $content = "@echo off`r`nstart /min `"`" powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$QQ_DIR\qq.ps1`" start`r`n"
    [System.IO.File]::WriteAllText($link, $content, [System.Text.Encoding]::GetEncoding(936))
    Write-Host "开机自启已启用（隐藏窗口）: $link"
  } elseif ($on -eq "off") {
    Remove-Item $link -ErrorAction SilentlyContinue
    Write-Host "开机自启已关闭"
  } else {
    Write-Host "用法: qq autostart on|off"
  }
}

function Show-Logs {
  $logOut = Join-Path $NAP_DIR "napcat-console.log"
  $logErr = Join-Path $NAP_DIR "napcat-console.err.log"
  if (-not (Test-Path $logOut)) { Write-Host "暂无日志（NapCat 可能未启动过）"; return }
  $lines = Get-Content $logOut -Tail 30 -ErrorAction SilentlyContinue
  if ($lines) {
    Write-Host "===== NapCat 最近日志（stdout 尾 30 行）====="
    $lines
  }
  if ((Test-Path $logErr) -and (Get-Item $logErr).Length -gt 0) {
    Write-Host "`n===== 错误输出（stderr）====="
    Get-Content $logErr -Tail 15 -ErrorAction SilentlyContinue
  }
}

function Install-Path {
  $cur = [Environment]::GetEnvironmentVariable("Path", "User")
  if ($cur -match [regex]::Escape($QQ_DIR)) { Write-Host "PATH 已包含 $QQ_DIR"; return }
  [Environment]::SetEnvironmentVariable("Path", ($cur.TrimEnd(';') + ";" + $QQ_DIR), "User")
  Write-Host "已把 $QQ_DIR 加入用户 PATH。"
  Write-Host "请新开一个终端，之后即可在任意目录执行: qq send 消息内容"
}

switch ($Action.ToLower()) {
  "send"      { Send-Notice }
  "start"     { Start-NapCat }
  "stop"      { Stop-NapCat }
  "status"    { Show-Status }
  "logs"      { Show-Logs }
  "autostart" { Set-Autostart }
  "install"   { Install-Path }
  default {
    Write-Host @"
===== QQ 通知通道 (qq) =====
用法:
  qq send "消息内容"     发送 QQ 通知到主号 940841288
  qq send                交互式输入消息（直接双击 qq.cmd 也可）
  qq start               后台启动 NapCat（窗口完全隐藏，无任务栏图标）
  qq stop                停止 NapCat
  qq status              健康检查
  qq logs                查看 NapCat 日志（隐藏窗口后用它排查）
  qq stop                停止 NapCat
  qq status              健康检查
  qq autostart on|off    开机自启开关
  qq install             加入 PATH，任意目录可用 qq 命令
"@
  }
}
