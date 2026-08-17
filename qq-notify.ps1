# qq-notify.ps1 —— QQ 通知脚本（模式 A：通知通道）
# 用法:
#   .\qq-notify.ps1 -Message "任务完成: 备份已结束"
#   .\qq-notify.ps1 -Message "构建成功" -To 123456789        # 指定接收 QQ 号
#   .\qq-notify.ps1 -Message "..." -Bot 987654321 -BotPort 3002   # 指定机器人号/端口
# 前提: NapCat 已启动并登录（HTTP API 端口默认 3002；3000/3001 被 Docker 占用）
param(
  [Parameter(Mandatory = $true)][string]$Message,
  [string]$To = "940841288",
  [string]$Bot = "",
  [int]$BotPort = 3002,
  [string]$Server = "127.0.0.1"
)
$ErrorActionPreference = "Stop"
if ($To -eq "请填主号QQ") {
  Write-Error "请先在本脚本顶部把 -To 默认值改成你的主号 QQ，或每次调用时传 -To"
  exit 1
}
$payload = @{
  user_id = [int64]$To
  message = $Message
} | ConvertTo-Json -Compress
try {
  # 关键: PS5.1 的 Invoke-RestMethod 发字符串 body 默认按 ASCII 编码，中文会变 "?"。
  # 必须先把 JSON 转成 UTF-8 字节数组再发送。
  $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($payload)
  $resp = Invoke-RestMethod -Uri "http://${Server}:$BotPort/send_private_msg" -Method Post -ContentType "application/json; charset=utf-8" -Body $bodyBytes
  Write-Host "[qq-notify] 已发送: $Message (status=$($resp.status))"
} catch {
  Write-Error "[qq-notify] 发送失败: $($_.Exception.Message)"
  exit 2
}
