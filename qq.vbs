' QQ 通知发送 - 双击运行，全程无窗口
' 输入消息后回车即发送到主号 QQ (940841288)
Dim ws, msg, cmd
Set ws = CreateObject("WScript.Shell")
msg = InputBox("输入要发送到主号 QQ (940841288) 的消息：" & vbCrLf & vbCrLf & "（直接回车取消）", "QQ 通知发送")
If msg = "" Then WScript.Quit
' 防引号破坏命令行
msg = Replace(msg, """", " ")
msg = Replace(msg, "'", " ")
cmd = "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command ""& 'D:\Project\qq-remote-deploy\qq-notify.ps1' -Message """ & msg & """ """
ws.Run cmd, 0, True
MsgBox "已发送: " & msg, 64, "QQ 通知"