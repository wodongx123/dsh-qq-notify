# QQ 任务通知 / 远控通道 —— 部署与使用文档

> 在 DSH（DeepSeek Harness）平台上实现"耗时任务完成后通过 QQ 主动通知我"。
> 本机已实际跑通：DSH 桥接插件 + NapCat（QQ 协议层）。本文档供**在另一台设备上重新部署**。

---

## 0. 需求与架构

**核心需求（2026-08 确认）**：设备上跑耗时任务 → 完成后 **QQ 主动通知**（出站通知为主；可选入站远控）。

```
耗时任务完成 ──> qq-notify（一行命令/脚本）──> NapCat HTTP API (127.0.0.1:3000)
                                                    │
                                          [可选] DSH 桥接插件(入站远控) ws://127.0.0.1:17460/qq/ws
                                                    │
                                                    └──> 机器人小号 ──私聊──> 你的主号 QQ
```

**重要事实（2026 现状）**：
- ❌ QQ 开放平台官方机器人：**主动推送已于 2025-04-21 停止**（只能被动回复）→ 无法做主动通知
- ❌ Qmsg酱：已停止运营
- ✅ **NapCat / LLOneBot（非官方协议）是目前 QQ 主动通知唯一可行路径**
- ⚠️ 账号风险只落在"机器人小号"上；主号只接收，零风险

**两种模式**：
- **模式 A（通知，推荐）**：只需 NapCat + `qq-notify.ps1`，**不需要 DSH 插件**
- **模式 B（远控，进阶）**：加 DSH 桥接插件（`qq-remote-plugin.js`），QQ 发指令 → 本机 DSH 子代理执行

---

## 1. 前置条件

| 项 | 要求 | 说明 |
|---|---|---|
| 系统 | Windows 10/11 x64 | |
| Node.js | ≥ 22（NapCat 自带 node.exe，无需系统 Node） | DSH 侧需要 Node 环境 |
| 磁盘 | ≥ 300 MB 可用 | |
| **QQ 机器人小号** | 必须 | 见 §2 |
| 网络 | 能访问腾讯 QQ 服务器 | 国内网络即可 |

> 不需要安装 QQ 桌面客户端！NapCat Shell 用自带框架跑（但**缺 `crypto.dll`/`ssl.dll` 时需从已装 QQ 里复制**，见 §4.3 或直接安装一次 QQ）。

---

## 2. 准备 QQ 机器人小号（必做，约 3 分钟）

1. 手机 QQ → 头像 → **设置 → 切换账号 → 注册新账号**（需一个能收短信的手机号，可用家人闲置号）
2. 注册时**记下 QQ 号和密码**；注册后可解绑手机，改用密码/邮箱保护
3. 用**主号把机器人小号加为好友**（机器人才能私聊通知你）
4. 小号只当"发件箱"，不参与聊天

---

## 3. 部署 NapCat（QQ 协议层）

### 3.1 下载

```powershell
# 到 GitHub Releases 下载（本文档使用 v4.18.19）：
#   https://github.com/NapNeko/NapCatQQ/releases
#   选择: NapCat.Shell.Windows.Node.zip  （Windows 独立 Shell，自带 node）
```

### 3.2 解压

解压到固定目录，例如 `D:\qq-remote\napcat\`（路径不要含中文空格更稳）。

### 3.3 两个必要修复（重要，本机踩过的坑）

**修复 1 —— `--no-sandbox` bug**（NapCat 会把该 Chromium 参数传给标准 node，直接崩）：
用编辑器打开 `napcat\napcat.mjs`，找到这一行：
```js
...Hu ? {} : { execArgv: ["--no-sandbox"] }
```
改为：
```js
...Hu ? {} : {}
```
> ✅ 本机已验证：v4.18.19 的 `napcat.mjs` 已无 `--no-sandbox`，无需此修复。

**修复 2 —— 缺失 `crypto.dll` / `ssl.dll`**（wrapper.node 加载失败 "The specified module could not be found"）：
从已安装 QQ 的框架目录复制两个 DLL 到 `napcat\` 根目录（wrapper.node 旁边）：
```powershell
# 若设备装过 QQ（QQNT），版本号以实际为准：
Copy-Item "C:\Program Files\Tencent\QQNT\versions\9.9.33-52074\resources\app\crypto.dll" "D:\qq-remote\napcat\"
Copy-Item "C:\Program Files\Tencent\QQNT\versions\9.9.33-52074\resources\app\ssl.dll"     "D:\qq-remote\napcat\"
# 若设备没装过 QQ：先装一次 QQNT 再复制；或从其他机器拷贝这两个 DLL
```

### 3.4 启动

```powershell
cd D:\qq-remote\napcat
.\node.exe index.js
# 已登录过账号时可用快速登录（免扫码）：
.\node.exe index.js -q 3053818342
# 或直接使用本项目的一键启动脚本（自动检测已登录账号）：
.\start-napcat.ps1
```
- 首次启动会打印 **WebUI 地址**：`http://127.0.0.1:6099/webui?token=<随机token>`（token 也会写入 `napcat\config\webui.json`）
- 控制台打印**二维码**，同时保存到 `napcat\cache\qrcode.png`
- ⚠️ 在受限沙箱/受限终端里若报 `spawn EPERM`（fork 子进程被禁）→ 用管理员/非受限方式运行

### 3.5 登录（扫码）

1. 浏览器打开 WebUI 地址（或打开 `cache\qrcode.png`）
2. **用机器人小号**扫码 → 手机授权
3. 成功后 NapCat 生成 `napcat\config\onebot11_<小号QQ号>.json`
4. **以后重启**：日志会提示"可用于快速登录的 QQ"，用 `-q <小号QQ>` 启动即可免扫码（登录状态持久化在 `napcat_<QQ>.json`）

> ⚠️ 同一账号不能双端在线：**不能**用已在桌面 QQ 登录的主号登录 NapCat。
> 二维码过期会自动刷新；WebUI 页面会自动更新。

---

## 4. 模式 A：QQ 通知通道（推荐，5 分钟）

### 4.1 确认 OneBot HTTP 接口

登录后检查 `napcat\config\onebot11_<QQ>.json`，确认启用了 HTTP 服务：
```json
{ "network": { "httpServers": [ { "enable": true, "port": 3002 } ] } }
```
> ⚠️ **本机端口已从默认 3000 改为 3002**：`3000/3001` 被本机 Docker Desktop 占用（`com.docker.backend` 监听）。
> 若其他设备无冲突可沿用 3000。发通知 = `POST http://127.0.0.1:3002/send_private_msg`
> v4.18.19 新版本生成的 onebot 配置默认 **httpServers 为空**，需手动添加（参见本目录 `onebot11_3053818342.json` 实际配置）。

### 4.2 安装通知脚本

复制 `qq-notify.ps1` 到部署目录，**把脚本顶部默认 `-To` 改成你的主号 QQ**（本机已改为 940841288），然后：

```powershell
# 任务结束处调用（PowerShell）
.\qq-notify.ps1 -Message "备份完成，耗时 12 分钟"
.\qq-notify.ps1 -Message "构建失败: 第 3 个用例挂了" -To 123456789

# 任意语言/任务里调用（等价 curl，注意 -d 里中文需 UTF-8 终端）
curl.exe -X POST "http://127.0.0.1:3002/send_private_msg" -H "Content-Type: application/json" -d '{"user_id": 123456789, "message": "任务完成"}'
```

**与 DSH 后台任务集成**：让 DSH 智能体在后台任务（pwsh 后台作业）结束时执行 `qq-notify.ps1` 即可。

### 4.3 验证

用主号给机器人小号发一条消息建立会话（**必须先把小号加为好友**，否则 NapCat 报"无法获取用户信息"），然后 `qq-notify.ps1 -Message "测试"`，主号应收到。

---

## 5. 模式 B：QQ 远控通道（可选，进阶）

在 DSH 会话内定义并运行桥接插件（代码在 `qq-remote-plugin.js`）：

1. 用 `cordis_define` 定义插件：`code.host` = `qq-remote-plugin.js` 的内容（plugin kind=new，idPrefix=qqrm）
2. `cordis_run` 运行
3. 在 NapCat 的 `onebot11_<QQ>.json` 里启用反向 WS：
   ```json
   { "websocketReverseServers": [ { "enable": true, "url": "ws://127.0.0.1:17460/qq/ws" } ] }
   ```
   保存后 NapCat 自动重连；DSH 插件控制台出现 `[qq-remote] websocket connected`
4. 编辑插件代码：`ALLOW_USERS` 填你的主号 QQ（白名单），重新 define/update 包
5. 主号私聊机器人发任意指令 → 本机 DSH 子代理执行 → 结果回发主号
   - `/状态` `/help` 为内置命令

> ⚠️ 动态插件不随 DSH 重启持久化：harness 重启后需重新 cordis_define + run（代码文件已存档）。
> 长期方案：把插件改为宿主组合（cordis.patch.yml）中的正式插件，可加我帮你做。

---

## 6. 安全清单（必读）

- [ ] 机器人小号专用，不与主号混用；主号零协议风险
- [ ] 模式 B 必须配白名单（`ALLOW_USERS`），未授权号码一律拒绝
- [ ] NapCat HTTP/WebUI 端口默认只监听 127.0.0.1，勿开放公网
- [ ] 非官方协议有封号风险（小号承担）；小号只发通知不闲聊可降低检测面
- [ ] 通知内容只发给自己；涉及敏感信息注意日志留存

---

## 7. 故障排查

| 症状 | 原因 | 处理 |
|---|---|---|
| `bad option: --no-sandbox` | NapCat shell bug | §3.3 修复 1（v4.18.19 已无此问题） |
| `wrapper.node ... could not be found` | 缺 crypto/ssl.dll | §3.3 修复 2 |
| `spawn EPERM` | 受限终端禁 fork | 非受限方式运行（本机需在完整权限下启动） |
| "当前账号已登录,无法重复登录" | 同账号双端 | 用独立小号（§2） |
| 发通知返回 `status=failed` / "无法获取用户信息" | 小号与主号**不是好友**/无会话 | 主号加小号为好友并先发一条消息（§2.3） |
| 收到消息全是 `??????` 乱码 | PS 5.1 `Invoke-RestMethod` 按 ASCII 编码 | 用已修复版 `qq-notify.ps1`（UTF-8 字节 body）或 curl |
| `Cannot overwrite variable Host` | `$Host` 是 PS 只读自动变量 | 参数改名（本脚本已用 `$Server`） |
| PS 5.1 跑中文脚本报解析错误 | 脚本无 BOM 被按 GBK 解码 | 保存为 UTF-8 with BOM（本目录脚本已处理） |
| 端口 3000/3001 被占 | Docker Desktop 等占用 | 改用 3002（本机现状）或换端口 |
| 发通知无响应 | NapCat 未登录 / 端口不对 | 检查 3002 端口与登录状态（`get_login_info`） |
| 二维码过期 | 正常 | WebUI 自动刷新 / 重启 NapCat |
| DSH 插件收不到连接 | 反向 WS 未配置/未重载 | 检查 onebot11 配置并保存重连 |

---

## 8. 文件清单

```
qq-remote/
├── DEPLOY.md              ← 本文档
├── qq-notify.ps1          ← 通知脚本（模式 A，主号已配 940841288，端口 3002）
├── qq-remote-plugin.js    ← DSH 桥接插件代码存档（模式 B）
├── mock-client.mjs        ← 无 QQ 时的链路自测工具
├── start-napcat.ps1       ← 一键启动 NapCat（自动快速登录已登录账号）
├── dsh-qq-notify/         ← ★ 符合 DSH 规范的 QQ 通知插件包
│                           工具: qq_send / qq_status / qq_napcat
│                           package.json 声明 dsh.bundle.patch + cordis.patch.yml
│                           已安装到 profiles\web\node_modules 并在
│                           profiles\web\cordis.patch.yml 挂载（重启 DSH 生效）
│                           规范安装: dsh plugin --profile web add file:<本目录>
│                           发布市场: 见包内 README.md（awesome-dsh-plugin registry）
├── start-llbot.ps1        ← （LLBot 方案遗留，已弃用，可忽略）
├── llbot/                 ← （LLBot 方案遗留，已弃用，可删除）
└── napcat/                ← NapCat 部署目录（已登录小号 3053818342，HTTP 3002）
```

**清理项**：若放弃 LLBot，可删除 `llbot/`、`llbot-download.zip`、`napcat-download.zip`。

---

## 9. 附：备选通知渠道（不想用小号时）

| 渠道 | 通知到 | 性质 |
|---|---|---|
| 企业微信机器人 Webhook | 企业微信 | 腾讯官方、免费、秒开，一行 curl 推送 |
| Server酱 / PushPlus | 微信 | 第三方、免费额度 |
| 邮件 | 任意邮箱 | 最稳，但非即时 |

若 QQ 通知不是硬性要求，企业微信 Webhook 是最省事的官方方案。
