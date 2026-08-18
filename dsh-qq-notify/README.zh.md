# dsh-qq-notify —— QQ 通知插件

通过本机 NapCat 机器人向主号 QQ 发送私聊通知。装好后在 DSH 里**直接说人话**就能发，自带一个**纯本地 HTML 控制台**。

## 使用

### ① 本地网页控制台（零依赖）

打开 `qq-panel.html` 双击即可：

- 通道状态：NapCat 在线/离线、机器人号
- 发送框：输入消息 → 点「发送」
- 管理按钮：启动 / 停止 / 重启 NapCat

不依赖 DSH 在线，不用开新端口。

### ② DSH 对话（6 个工具）

| 你说 | 效果 |
|---|---|
| `用QQ发：xxx` | 发送到主号 |
| `查看当前QQ配置` | 显示所有配置项 |
| `我的QQ主号改成 xxx` | 改配置并保存 |
| `查一下QQ通道状态` | NapCat 是否在线 |
| `启动QQ通知` / `重启NapCat` | 后台启停 |
| `帮我装好QQ通知` | 自动下载部署 NapCat |

### ③ 命令行

```bat
qq send "消息"    qq status    qq start / stop / restart / logs    qq autostart on
```

## 安装

```bash
dsh plugin --profile web add file:<本目录>
```

重启 DSH 后生效。全新机器需先安装 QQ（提供加密 DLL），然后说 `帮我装好QQ通知` 即可走完全流程。
