# dsh-qq-notify —— QQ 通知插件

通过本机 NapCat 机器人向主号 QQ 发送私聊通知。**6 个 DSH 工具全自动部署**，纯 HTML 控制台双击即用。

## 使用

### ① 本地网页控制台（零依赖）

打开 `qq-panel.html` 双击即可：

- 通道状态：NapCat 在线/离线、机器人号
- 发送框：输入消息 → 点「发送」
- 管理按钮：启动 / 停止 / 重启 NapCat

不依赖 DSH 在线，不用开新端口，直接调本机 NapCat API。

### ② DSH 对话（6 个工具）

| 你说 | 效果 |
|---|---|
| `用QQ发：xxx` | 自动调用发送 |
| `帮我装好QQ通知` | **内置引擎：下载→解压→修复→引导登录** |
| `查看当前QQ配置` | 显示所有配置项 |
| `我的QQ主号改成 xxx` | 改配置并保存到磁盘 |
| `查一下QQ通道状态` | NapCat 是否在线 |
| `启动QQ通知` / `重启NapCat` | 后台启停管理 |

### ③ 命令行

```bat
qq send "消息"    qq status    qq start / stop / restart / logs    qq autostart on
```

## 全新机器一步到位

在 DSH 里说 `帮我装好QQ通知`，模型会调用内置部署引擎完成：
- 从 GitHub 下载最新版 NapCat Shell
- 自动解压安装
- 修复已知 bug
- 提示你扫码登录（唯一需要人工操作的步骤）

## 安装

```bash
dsh plugin --profile web add file:<本目录>
```

重启 DSH 后生效。要求 Windows 10/11 x64、一个已登录的机器人小号、机器人已加主号为好友。
