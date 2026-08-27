# dsh-qq-notify —— QQ 通知插件

通过本机 NapCat 机器人向主号 QQ 发送私聊通知。**8 个 DSH 工具全流程覆盖**：部署、启动、配置、状态检查、消息发送。无需任何网页/外部界面，全部在 DSH 对话内完成。

## 功能（全部在 DSH 对话中完成）

| 你说 | 工具 | 效果 |
|---|---|---|
| `帮我装好QQ通知` | `qq_deploy` | 全自动部署：下载→解压→修复→引导登录 |
| `启动QQ通知` / `重启NapCat` | `qq_napcat` | 后台启停 NapCat |
| `查一下QQ通道状态` | `qq_status` | NapCat 是否在线、登录账号 |
| `用QQ发：xxx` | `qq_send` | 向主号发送私聊消息 |
| `查看当前QQ配置` | `qq_config_show` | 显示所有配置项 |
| `我的QQ主号改成 xxx` | `qq_config_set` | 修改配置并保存到磁盘 |
| `检测某目录是不是NapCat` | `qq_detect` | 检查指定目录是否合法 NapCat |
| `扫描全机NapCat` | `qq_find` | 自动发现所有安装实例 |

## 全新机器一步到位

在 DSH 里说 `帮我装好QQ通知`，模型调用内置部署引擎自动完成：
1. 从 GitHub 下载最新版 NapCat Shell（Windows Node 版）
2. 自动解压安装到自动发现/指定的目录
3. 修复已知 bug（--no-sandbox、预置 crypto.dll/ssl.dll）
4. 提示扫码登录 WebUI（唯一需要人工的步骤）

登录后即可使用。之后 NapCat 自动快速登录，无需重复扫码。

## 安装

```bash
dsh plugin --profile web add file:<本目录>
```

> **如果你是从 DSH 应用市场直接下载安装的**，插件已完成注册，**无需执行上面这条命令**，重启 DSH 后即可使用；此命令仅适用于手动拿到源码包/目录、需要本地注册的场景。

重启 DSH 后生效。要求：
- Windows 10/11 x64
- 一个已登录的机器人小号（napcat 扫码使用）
- 机器人已加主号为好友

## 配置项

| 键 | 默认值 | 说明 |
|---|---|---|
| `mainQq` | 空 | 接收通知的主号 QQ（用 `qq_config_set mainQq` 设置） |
| `apiPort` | `3002` | NapCat HTTP API 端口 |
| `napcatDir` | 自动发现 | NapCat 部署目录（也可用 `qq_find` 自动定位） |
| `botQq` | 空 | 机器人小号 QQ（可选） |

配置文件持久化在 `<插件根目录>/napcat/qq-notify.config.json`。