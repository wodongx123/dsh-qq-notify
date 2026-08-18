# QQ 通知通道

一套 Windows 上的 QQ 通知方案：**耗时任务完成 → 自动发 QQ 私聊给你**。底层通过本机 NapCat 机器人（小号承担风险，主号零风险）。

## 全新机器一键上手（约 3 分钟）

### 第 1 步：确认已装一个 QQ（NT 版）

NapCat 需要从 QQNT 复制加密模块。去 https://im.qq.com/ 下载安装最新版 **QQ NT** 即可。不登录也行。

### 第 2 步：准备一个小号（机器人号）

登一个不会用到的 QQ 账号当机器人。**不需要扫码，只需能接收消息就行。**

### 第 3 步：在 DSH 里说

重启 DSH 后，直接告诉模型：

> `帮我装好QQ通知`

模型会自动执行以下全部操作：
- 下载 NapCat Shell（约 111MB）
- 从你的 QQNT 复制 crypto.dll / ssl.dll
- 修复已知 bug

完成后会提示你运行 `qq start`。

### 第 4 步：扫码登录 + 发消息

```bat
qq start                          # 启动 NapCat
```

用【小号】手机 QQ 扫描登录：
- WebUI：http://127.0.0.1:6099/webui
- 或 napcat\cache\qrcode.png

登录成功后，在 DSH 会话里说：

> `我的QQ主号改成 940841288`

然后就可以发了：

> `用QQ发：任务完成了！`

---

## 日常使用（3 种方式）

### 1. 网页控制台（双击即用）

**`qq-panel.html`** 就是完整控制台 —— 双击打开浏览器：

| 区域 | 功能 |
|---|---|
| 上方 | 在线状态、机器人号 |
| 中间 | 输入消息 → 点「发送」 |
| 下方 | 启动 / 停止 / 重启 NapCat |

不依赖 DSH 在线，不用开新端口，直接调本机 3002。

### 2. DSH 对话

| 你说 | 效果 |
|---|---|
| `用QQ发：xxx` | 发通知 |
| `查看当前QQ配置` | 显示所有配置 |
| `QQ主号改成 xxx` | 改配置并保存 |
| `查一下QQ通道状态` | NapCat 是否在线 |
| `启动QQ通知` / `重启NapCat` | 后台管理 |

### 3. 命令行

```bat
qq send "消息"    qq status    qq start / stop / restart / logs    qq autostart on
```

## 故障排查

| 现象 | 处理 |
|---|---|
| `crypto.dll 缺失` | 先装一个 QQ，再运行一次 `qq-deploy.ps1` |
| 发送失败 "无法获取用户信息" | 主号先加机器人小号为好友 |
| 收到消息全是 `?` | 用目录下的 `qq-notify.ps1`（已修编码） |
| 页面连不上 | 确认 `qq start` 成功（NapCat 正在运行） |
| 机器人掉线 | `qq restart` 或网页点「重启」 |

> 项目地址：https://github.com/wodongx123/dsh-qq-notify
