# DSH 插件市场安装指南

本文档说明如何正确地将插件打包为符合 DSH 市场规范的 package，以及用户如何通过市场标准方式安装和使用。

---

## 一、插件开发：最小规范要求

你的插件仓库必须包含以下文件和声明，缺一不可：

### 1. `package.json` — 核心注册信息

```json
{
  "name": "dsh-qq-notify",           // ⚠️ 必须唯一，建议前缀如 owner--plugin-name
  "version": "0.1.0",
  "type": "module",                   // ESM（CORDIS 不支持 CommonJS）
  "main": "lib/index.js",             // CORDIS 加载入口
  "exports": {
    ".": "./lib/index.js"
  },
  "dsh": {
    "bundle": {
      "patch": "./cordis.patch.yml"   // ⚠️ 必须声明，CORDIS 扫描到此字段即自动注册
    }
  },
  "peerDependencies": {
    "@deepseek-ai/dsh-tools": "^0.1.0-rc.6"
  }
}
```

**关键字段说明：**

| 字段 | 作用 | 必须？ |
|---|---|---|
| `name` | 包的标识符，市场索引的唯一键 | ✅ |
| `main` | CORDIS 通过 `import('xxx')` 加载的入口文件 | ✅ |
| `dsh.bundle.patch` | 声明本包是一个 bundle；CORDIS 扫描到此字段后自动将其 cordis.patch.yml 注入系统 | ✅ |
| `peerDependencies` | 声明依赖的基础包（CORDIS 会在安装时一并拉取） | ✅ |

### 2. `cordis.patch.yml` — Bundle 注册文件

```yaml
# 你的包自己的 cordis.patch.yml（放在 src/ 或根目录均可）
- insert:
    - id: my-plugin                     # ⚠️ id 唯一，不能和其他 bundle 冲突
      name: 'my-plugin-package'         # 显示名称（可任意）
      config:                           # 可选：默认配置值
        theme: dark
        port: 8080
```

**规则：**
- 只写 `- insert:` 这一种操作
- `id` 必须全局唯一（每个插件一个独立 id）
- 此文件由包开发者维护，**用户绝不能修改**

---

## 二、用户安装流程（标准方式）

### 方法 A：通过 DSH 界面点击安装

1. 打开 DSH Web GUI → 进入插件市场页面
2. 搜索到目标插件
3. 点击 **"Install"** / **"添加"**
4. DSH 执行 `dsh plugin --profile web add <包名>`
5. **全自动完成后续所有步骤**，无需任何手动操作

### 方法 B：通过命令行安装

```bash
# 从 npm 市场安装
dsh plugin --profile web add my-plugin-from-market

# 从本地路径安装（适用于开发调试）
dsh plugin --profile web add file:D:\path\to\my-plugin
```

---

## 三、安装后的自动化处理

当用户执行完上述任一安装方式后，CORDIS/Harness 会自动执行以下操作：

| 步骤 | 内容 | 是否需用户干预 |
|---|---|---|
| **① pnpm install** | 将包拉到 `profiles/web/node_modules/<包名>/` | ❌ 自动 |
| **② 扫描 dsh.bundle.patch** | 发现 `"dsh":{"bundle":{"patch":"..."}}` 声明 | ❌ 自动 |
| **③ 读取 cordis.patch.yml** | 解析其中的 `- insert:` 指令，注入插件 registry | ❌ 自动 |
| **④ 添加到 bundles 列表** | 在 profile/package.json 中追加该包名到 `dsh.profile.bundles` | ❌ 自动 |
| **⑤ 下次启动生效** | Harness 重启时统一加载所有 patch | ❌ 自动 |

**全过程零手写。**

---

## 四、⚠️ 绝对禁止的手动操作

以下内容是新手最容易踩坑的地方，请务必注意：

### ❌ 错误做法：手改 profiles/web/cordis.patch.yml 插入了重复 entry

```yaml
# 这是错误的！会闪退！
- insert:
    - id: my-plugin                    # ← 如果 bundle 已经写了这个 id，再写一次就崩
      name: 'my-plugin-package'
```

**原因**：同一 `id` 被两次 insert → CORDIS 拒绝启动 → harness exit code 1 → DSH 闪退。

### ✅ 正确做法：只改配置文件，不改 patch 结构

如果你需要覆盖某个插件的配置（比如改端口），应该在 **包自身提供的配置文件** 中修改，例如：
- `my-plugin.config.json`
- `~/.config/my-plugin/settings.yaml`
- 或通过环境变量传递

**绝不碰 `profiles/web/cordis.patch.yml`。**

### ❌ 错误做法：手改了 bundle 自己的 cordis.patch.yml

```bash
# 这是错误的！
vim node_modules/my-plugin/cordis.patch.yml    # ← 绝不要改这里
```

**原因**：
1. pnpm install / update 时会覆盖回原始版本
2. bundle 系统的契约是不可变输入

### ❌ 错误做法：同时修改 package.json + cordis.patch.yml 的 insert 部分

```json
// ❌ 这样会导致双重插入
"dsh": {
  "profile": {
    "bundles": ["my-plugin"]          // ← 加上这个
  }
}
```

```yaml
# ❌ 又在这里写了一次同样的 insert
- insert:
    - id: my-plugin
      name: 'my-plugin-package'
```

结果就是同一个 id 被 insert 两次 → 崩溃。

---

## 五、故障排查清单

| 症状 | 可能原因 | 解决方式 |
|---|---|---|
| DSH 闪退、无法启动 | cordis.patch.yml 中有重复的 `- insert: id: xxx` | 删除 profile 层的重复条目；保留 bundle 层的原始版本即可 |
| 插件不加载 | package.json 缺少 `"dsh":{"bundle":{"patch":"..."}}` | 补上该声明并指定正确的 path |
| 插件加载但报错 | Cordis 日志中出现 `[plugin] error: ...` | 查看 `~/AppData/Roaming/dsh-desktop/logs/harness.log` |
| 模块找不到 | main 指向的路径不存在 | 确保 `package.json` 中的 `main` 字段指向实际存在的 `.js` 文件 |
| peerDeps 未安装 | 提示 `ERR_PEER_DEP_MISSING` | 重新运行 `dsh plugin --profile web add <包名>` 让其自行解析依赖 |

---

## 六、发布到市场的完整流程（面向插件作者）

| 步骤 | 操作 | 工具 |
|---|---|---|
| **① 准备代码** | 创建满足规范的目录结构（见第一章） | Git |
| **② 测试本地安装** | `dsh plugin --profile web add file:<your-path>` | CLI |
| **③ 推送仓库** | git push origin main | GitHub/GitLab |
| **④ 提交 PR** | fork awesome-dsh-plugin → 添加 YAML → PR 合并 | PR |
| **⑤ 市场收录** | awesome-dsh-plugin PR 合并 → plugins.json 更新 | CI/自动 |
| **⑥ 用户可以安装** | 用户在市场搜到你的插件并点击安装 | GUI/CLI |

---

## 七、总结对照表

| 层级 | 谁管 | 管什么 | 能否手动改 |
|---|---|---|---|
| 市场列表（awesome-dsh-plugin） | 市场维护者 | 哪些包可以装 | 只能通过 PR |
| CLI 安装（pnpm） | DSH 框架 | 拉包进 node_modules | 可通过 CLI 管理 |
| Bundle patch（cordis.patch.yml） | 包开发者 | 注册 id 和默认配置 | 只能改源仓库 |
| Profile patch | 运维人员 | 删除已有 entry（极少用） | ✅ 仅此场景才用 |
