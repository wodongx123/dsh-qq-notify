# QQ 任务通知 / 远控通道（DSH）

在 DeepSeek Harness（DSH）上实现：**耗时任务完成 → QQ 主动通知你**。底层用本机 NapCat 机器人（非官方协议，小号承担风险，主号零风险）。

## 快速开始（只需 3 步）

1. **确认 NapCat 在运行**：命令行执行 `qq status`，显示"HTTP API 3002 监听中"即可；没运行就 `qq start`
2. **重启 DSH**（让插件加载，只需要做一次）
3. 之后任选一种方式发通知 👇

## 怎么用

### 方式一：网页控制台（最直观）

浏览器打开 **http://127.0.0.1:3003**（QQ 通知控制台）：

- 上方：通道状态（NapCat 在线/离线、机器人号）
- 中间：输入消息 → 点「发送」
- 下方：NapCat 启动 / 停止 / 重启 按钮

### 方式二：直接对话（和 Qclaw 一样）

重启 DSH 后，在任意会话里直接说：

| 你说 | 效果 |
|---|---|
| `用QQ发：任务完成了` | 发送到主号 940841288 |
| `发QQ消息：构建成功` / `QQ通知我：...` | 同上 |
| `查一下QQ通道状态` | 返回 NapCat 是否在线、机器人号 |
| `启动QQ通知` / `重启NapCat` | 后台启停 NapCat |
| `帮我装好QQ通知` | 自动下载部署 NapCat 并引导扫码 |

### 方式三：命令行 / 脚本

```bat
qq send "备份完成，耗时 12 分钟"   :: 发通知（默认发到主号）
qq status                          :: 查状态
qq start / qq stop / qq logs       :: 启停 NapCat、看日志
qq autostart on                    :: 开机自启（隐藏窗口）
```

任务结束处调用（任意语言）：`.\qq-notify.ps1 -Message "任务完成"`，或双击 `qq.vbs` 输入即发。

## 配置

编辑 `qq-notify.config.json`（本目录），重启 DSH 生效：

```json
{
  "mainQq": "940841288",             // 接收通知的主号
  "apiPort": 3002,                   // NapCat HTTP 端口
  "napcatDir": "D:\\...\\napcat",    // NapCat 目录
  "webPanelPort": 3003,              // 网页控制台端口
  "webPanelEnabled": true
}
```

## 故障排查

| 现象 | 处理 |
|---|---|
| 发送返回"无法获取用户信息" | 主号先加机器人小号为好友 |
| 收到消息全是 `?` | 用本目录的 `qq-notify.ps1`（已修 UTF-8） |
| 网页控制台打不开 | 检查 NapCat 是否运行；端口被占用就改 `webPanelPort` |
| 机器人掉线 | `qq restart` 或网页点「重启」 |

> 项目地址：https://github.com/wodongx123/dsh-qq-notify
