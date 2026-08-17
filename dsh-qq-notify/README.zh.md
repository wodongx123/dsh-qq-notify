# dsh-qq-notify —— QQ 通知插件

通过本机 NapCat 机器人向主号 QQ 发送私聊通知。装好后在 DSH 里**直接说人话**就能发，还带一个**网页控制台**（挂在 DSH 现有 Web 上，无独立端口）。

## 使用

### ① 网页控制台

在 DSH 网页地址后加 `/qq-panel`（如 `http://127.0.0.1:52364/qq-panel`，端口随 DSH）：

- 通道状态：NapCat 在线/离线、机器人号
- 发送框：输入消息 → 点「发送」
- 管理按钮：启动 / 停止 / 重启 NapCat

### ② 对话直接说（装好后自带 4 个工具）

| 你说 | 触发工具 | 效果 |
|---|---|---|
| `用QQ发：任务完成了` | qq_send | 发到主号 |
| `查一下QQ通道状态` | qq_status | NapCat 是否在线、机器人号 |
| `启动QQ通知` / `重启NapCat` | qq_napcat | 后台启停 |
| `帮我装好QQ通知` | qq_deploy | 自动下载部署 NapCat |

### ③ 命令行（不用插件也能用）

```bat
qq send "消息"     qq status     qq start / stop / restart / logs
```

## 配置

编辑部署目录下 `qq-notify.config.json`（重启 DSH 生效）：

```json
{
  "mainQq": "940841288",
  "apiPort": 3002,
  "napcatDir": "D:\\...\\napcat",
  "webPanelEnabled": true
}
```

> 插件本身不需要端口（工具进程内直连 NapCat；网页控制台挂在 DSH Web 的 `/qq-panel`）。

## 安装

```bash
dsh plugin --profile web add file:<本目录>
# 或放到 profiles\web\node_modules 并在 cordis.patch.yml 挂载
```

重启 DSH 后生效。要求：Windows 10/11 x64、已部署 NapCat（可用 qq_deploy 自动装）、机器人小号已登录且主号已加好友。
