# QQ 任务通知 / 远控通道（DSH 平台）

在 DSH 平台上实现"耗时任务完成 → QQ 主动通知"（可选扩展：QQ 远控本机）。

> 📄 **完整部署文档见 [`DEPLOY.md`](DEPLOY.md)** —— 包含 NapCat 部署、两个必要修复、登录流程、通知/远控两种模式、安全清单与故障排查，可直接在另一台设备照做。

## 快速入口

| 文件 | 用途 |
|---|---|
| `DEPLOY.md` | 部署与使用文档（从零开始） |
| `qq.cmd` | **一键命令入口**（双击/命令行均可，见下方用法） |
| `qq.ps1` | `qq.cmd` 的 PowerShell 实现（发消息/启停/自检/自启） |
| `qq-notify.ps1` | 底层通知脚本（`qq.cmd send` 内部调用） |
| `qq-remote-plugin.js` | DSH 桥接插件代码存档（远控模式） |
| `mock-client.mjs` | 无 QQ 时链路自测 |
| `start-napcat.ps1` | NapCat 启动脚本（开机自启也用它） |
| `napcat/` | NapCat 部署目录 |

## 日常使用（封装后的傻瓜用法）

**发通知**（最常用）：
```bat
qq send "备份完成，耗时 12 分钟"
```
或者**直接双击 `qq.cmd`** → 输入消息 → 回车即发送。

**管理 NapCat**（`qq.cmd` 需在 PATH 中，或到 `D:\Project\qq-remote-deploy` 目录执行）：
```bat
qq start        :: 后台启动 NapCat（窗口完全隐藏、无任务栏图标，自动快速登录）
qq stop         :: 停止 NapCat
qq status       :: 健康检查（端口/登录账号/自启状态）
qq logs         :: 查看 NapCat 日志（隐藏窗口后用它排查）
qq autostart on :: 开机自启（隐藏窗口，NapCat 随 Windows 启动，通知通道常在线）
qq install      :: 把本目录加入 PATH（新开终端后任意目录可用 qq 命令）
```

**双击发送（全程无窗口）**：双击 `qq.vbs` → 弹输入框 → 输入消息回车 → 自动隐藏发送并提示结果。

> ⚠️ `qq install`（改 PATH）和 `qq autostart on`（写启动项）需要在**普通终端**（双击 cmd 或手动打开 PowerShell）执行——DSH 沙箱环境会拦截注册表/系统目录写入。其余命令沙箱内也可用。

## DSH 规范插件（推荐：零搜索直接调用）

整套 QQ 通知功能已打包成**符合 DSH 规范的插件 `dsh-qq-notify`**（`dsh-qq-notify/` 目录，含 `dsh.bundle.patch` 声明 + cordis.patch.yml，可 `dsh plugin --profile web add file:<目录>` 安装、可发布到社区市场），提供 3 个原生工具：

| 工具 | 作用 |
|---|---|
| `qq_send` | 发 QQ 消息到主号（说"用QQ发：xxx"直接调用） |
| `qq_status` | 查 NapCat 是否在线、登录账号 |
| `qq_napcat` | 启停/重启 NapCat（start/stop/restart/status） |

- **效果**：重启 DSH 后，任何会话说"用QQ发：xxx / QQ通知我"，模型直接工具调用——不用搜代码、零搜索、几乎零 token
- 相当于把 Qclaw 的"内置发消息能力"搬进了 DSH，且比单工具版多了状态查询与 NapCat 管理
- 验证：三工具均已模拟加载 + 真实执行通过（发送 status=ok）
- 发布到 dsh-market：见 `dsh-qq-notify/README.md`（提交 awesome-dsh-plugin registry，分类 Notifications & Integrations）

**重启 DSH 生效**：完全退出 DSH 桌面应用再重新打开 → 新会话即可直接说"用QQ发：xxx"。
**重启前（当前会话）**：直接说"用QQ发：xxx"，我会调用 `qq-notify.ps1` 发送（效果相同，多花一点搜索 token）。

## 结论摘要（2026-08 验证）

- 官方机器人主动推送已停用；Qmsg 已停运 → **QQ 主动通知目前只能走 NapCat 等非官方协议**
- 主号只接收、零风险；协议风险由机器人小号承担
- **本机已重新部署并端到端实测通过（2026-08-17）**：
  - NapCat v4.18.19 运行中，机器人小号 **3053818342** 已登录（快速登录 `-q`）
  - OneBot HTTP API：`127.0.0.1:3002`（3000/3001 被 Docker 占用，已改端口）
  - `qq-notify.ps1` 已配主号 **940841288**，中文消息实测发送成功（已修复 PS 5.1 ASCII 乱码）
  - 一键启动：`.\start-napcat.ps1`
  - 模式 B（QQ 远控 DSH 插件）未启用（如需可加装，见 DEPLOY.md §5）
