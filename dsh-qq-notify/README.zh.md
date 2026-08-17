# dsh-qq-notify —— QQ 通知插件（DeepSeek Harness 规范）

基于本机 [NapCat](https://github.com/NapNeko/NapCatQQ) 机器人的 QQ 通知通道，为 DSH 提供三个模型可直接调用的原生工具：

| 工具 | 作用 |
|---|---|
| `qq_send` | 向主号 QQ（默认 `940841288`）发送私聊消息（走 OneBot HTTP `127.0.0.1:3002`）。零搜索原生调用 —— 说"用QQ发：…"即可直接发送。 |
| `qq_status` | 查询 NapCat 是否在线、当前登录的机器人账号。 |
| `qq_napcat` | 启停/重启/查询 NapCat（隐藏窗口启动，委托给 `qq.ps1`）。 |

## 环境要求

- Windows 10/11 x64，已部署本机 NapCat（部署步骤见父项目 `DEPLOY.md`）。
- OneBot HTTP API 位于 `127.0.0.1:3002`（本机 Docker 占用了 3000/3001，故用 3002）。
- 机器人小号 `3053818342` 已登录，且主号已加其为好友。

## 配置

三级配置，优先级从高到低：宿主组合 `config` > `qq-notify.config.json` > 内置默认：

| 字段 | 默认 | 含义 |
|---|---|---|
| `mainQq` | `940841288` | 接收通知的主号 QQ |
| `apiPort` | `3002` | NapCat OneBot HTTP API 端口 |
| `napcatDir` | `D:\Project\qq-remote-deploy\napcat` | NapCat 部署目录（`qq_napcat` 管理用） |
| `botQq` | `""`（自动探测） | 可选：指定机器人小号 |

- **用户友好方式**：直接编辑部署目录下的 `qq-notify.config.json`（安装时已生成，重启 DSH 生效）。
- **宿主组合方式**：在 `cordis.patch.yml` 插件条目的 `config:` 里覆盖。

## 安装（作为 profile 组合包）

在插件目录（或任意目录用相对路径）执行：

```bash
dsh plugin --profile web add file:D:/Project/qq-remote-deploy/dsh-qq-notify
# 无 dsh CLI 时，在 profile 目录里直接:
#   pnpm add file:D:/Project/qq-remote-deploy/dsh-qq-notify
```

`package.json` 的 `dsh.bundle.patch` 声明会让 profile 组合器自动把 `dsh-qq-notify` 加入层栈。重启 DSH 后，任意会话即可直接调用这三个工具。

## 开发自测

```bash
node --check lib/index.js
# 模拟 cordis 加载 + 工具注册 + 执行:
node --input-type=module -e "const m = await import('dsh-qq-notify'); const r=[]; const ctx={tools:{register:t=>r.push(t)}}; m.apply(ctx); console.log(r.map(t=>t.name));"
```

## 发布到社区市场（可选）

1. 把本包推到公开 GitHub 仓库。
2. 向 [awesome-dsh-plugin registry](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 提交 PR，加入条目：
   `{ "name": "dsh-qq-notify", "owner": "<你的ID>", "url": "<仓库>", "category": "notify", "description": { "en": "...", "zh": "..." }, "npm": null, "install": "dsh plugin --profile web add github:<你的ID>/dsh-qq-notify" }`
3. 之后就会出现在应用内插件市场的"通知与集成"分类里。

## 安全

- NapCat HTTP/WebUI 仅监听 `127.0.0.1`，勿暴露公网。
- 协议风险由机器人小号承担；主号只接收。
