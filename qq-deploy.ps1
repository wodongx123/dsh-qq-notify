# qq-deploy.ps1 —— NapCat 自动部署引导（供插件 qq_deploy 工具调用，也可手动运行）
# 功能:
#   1. 检测 napcatDir 是否已有可运行的 NapCat
#   2. 无则从 GitHub Releases 下载 NapCat.Shell.Windows.Node.zip 并解压
#   3. 自动修复: 从已装 QQNT 复制 crypto.dll/ssl.dll；检查 --no-sandbox bug
#   4. 输出引导信息（扫码登录提示）
# 用法:
#   .\qq-deploy.ps1                     # 默认部署到 napcat 子目录
#   .\qq-deploy.ps1 -Dir D:\qq\napcat   # 指定目录
#   .\qq-deploy.ps1 -SkipDownload       # 已有包时跳过下载（仅修复+检测）
param(
  [string]$Dir = "",
  [switch]$SkipDownload = $false,
  [string]$Version = ""   # 指定版本号（默认 latest）
)

$ErrorActionPreference = "Stop"
$base = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Dir) { $Dir = Join-Path $base "napcat" }

function Write-Step($msg) { Write-Host "[qq-deploy] $msg" }

# ---------- 1. 检测 ----------
$nodeExe = Join-Path $Dir "node.exe"
$indexJs = Join-Path $Dir "index.js"
$already = (Test-Path $nodeExe) -and (Test-Path $indexJs)
if ($already) {
  Write-Step "检测到已部署 NapCat 于 $Dir ，跳过下载。"
  & (Join-Path $base "qq.ps1") start
  exit 0
}

if ($SkipDownload) { Write-Step "-SkipDownload 但目录中无 NapCat，退出。"; exit 1 }

# ---------- 2. 下载 ----------
Write-Step "未检测到 NapCat，开始自动部署到 $Dir ..."
New-Item -ItemType Directory -Force -Path $Dir | Out-Null
$dl = Join-Path $env:TEMP "napcat-shell-download.zip"

$apiUrl = "https://api.github.com/repos/NapNeko/NapCatQQ/releases/latest"
if ($Version) { $apiUrl = "https://api.github.com/repos/NapNeko/NapCatQQ/releases/tags/$Version" }
$release = Invoke-RestMethod -Uri $apiUrl -Headers @{ "User-Agent" = "dsh-qq-notify-deploy" } -TimeoutSec 30
$asset = $release.assets | Where-Object { $_.name -match 'Shell\.Windows\.Node' -and $_.name -match '\.zip$' } | Select-Object -First 1
if (-not $asset) { Write-Step "未找到 Windows Node Shell 资产（release=$($release.tag_name)）。"; exit 1 }
Write-Step "下载 $($asset.name) ($([math]::Round($asset.size/1MB,1)) MB) from $($asset.browser_download_url) ..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $dl -TimeoutSec 600
Write-Step "下载完成，解压中 ..."
Expand-Archive -Path $dl -DestinationPath $Dir -Force
Remove-Item $dl -Force -ErrorAction SilentlyContinue

# ---------- 3. 修复 ----------
# 修复 A: --no-sandbox bug（旧版本 NapCat shell 会把 Chromium 参数传给标准 node）
$mjs = Join-Path $Dir "napcat\napcat.mjs"
if (Test-Path $mjs) {
  $content = [System.IO.File]::ReadAllText($mjs, [System.Text.Encoding]::UTF8)
  if ($content -match 'execArgv: \["--no-sandbox"\]') {
    $fixed = $content -replace 'execArgv: \["--no-sandbox"\]', 'execArgv: []'
    [System.IO.File]::WriteAllText($mjs, $fixed, [System.Text.Encoding]::UTF8)
    Write-Step "已修复 --no-sandbox bug。"
  }
}
# 修复 B: 缺失 crypto.dll/ssl.dll（从已装 QQNT 复制）
$wrapper = Join-Path $Dir "wrapper.node"
if ((Test-Path $wrapper) -and -not (Test-Path (Join-Path $Dir "crypto.dll"))) {
  $candidates = @()
  $qqDirs = @(
    "C:\Program Files\Tencent\QQNT\versions",
    "$env:LOCALAPPDATA\Programs\QQ\versions",
    "C:\Program Files (x86)\Tencent\QQNT\versions"
  )
  foreach ($qd in $qqDirs) {
    if (Test-Path $qd) {
      Get-ChildItem $qd -Directory -ErrorAction SilentlyContinue | ForEach-Object {
        $app = Join-Path $_.FullName "resources\app"
        if (Test-Path (Join-Path $app "crypto.dll")) { $candidates += $app }
      }
    }
  }
  if ($candidates.Count -gt 0) {
    $src = $candidates[0]
    Copy-Item (Join-Path $src "crypto.dll") (Join-Path $Dir "crypto.dll") -Force
    Copy-Item (Join-Path $src "ssl.dll") (Join-Path $Dir "ssl.dll") -Force -ErrorAction SilentlyContinue
    Write-Step "已从 $src 复制 crypto.dll/ssl.dll。"
  } else {
    Write-Step "未找到已安装的 QQNT；若启动报缺 crypto.dll/ssl.dll，请安装一次 QQ 后重跑本脚本。"
  }
}

# ---------- 4. 完成 ----------
Write-Step "部署完成: $Dir"
Write-Step "下一步: 运行 qq start 后，用【机器人小号】手机 QQ 扫码登录（WebUI: http://127.0.0.1:6099/webui 或查看 napcat\cache\qrcode.png）。"
Write-Step "登录一次后，以后启动自动快速登录（qq start / qq autostart on）。"
