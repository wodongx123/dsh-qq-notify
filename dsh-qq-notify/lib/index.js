// dsh-qq-notify —— 符合 DSH 规范的 QQ 通知插件
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { exec, execFile, execSync, spawn } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from "node:fs";
import { join, basename, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const execFileP = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const _defaultRoot = dirname(dirname(__filename));

// ================= 配置 & 自动发现 =================
const name = "qq-notify";
const inject = ["tools", "webServer"];

/** 自动发现项目根目录 */
function discoverRoot() {
  let p = dirname(__filename);
  for (let i = 0; i < 5; i++) {
    if (basename(p) === "node_modules") return dirname(dirname(p));
    try {
      const pkg = JSON.parse(readFileSync(join(dirname(p), "package.json"), "utf8"));
      if (pkg.name === "dsh-qq-notify") return dirname(p);
    } catch {}
    p = dirname(p);
    if (p.length <= 1) break;
  }
  return _defaultRoot;
}

const Config = z.object({
  mainQq: z.string().default(""),
  apiPort: z.number().default(3002),
  napcatDir: z.string().default(""),
  botQq: z.string().default("")
});

const DEFAULTS = { mainQq: "", apiPort: 3002, napcatDir: "", botQq: "" };

function saveConfig(cfg, root) {
  const configDir = join(root, "napcat");
  mkdirSync(configDir, { recursive: true });
  const configFile = join(configDir, "qq-notify.config.json");
  writeFileSync(configFile, JSON.stringify({ ...DEFAULTS, ...loadFileConfig(root), ...cfg }, null, 2) + "\n", "utf8");
}

function loadFileConfig(rootDir) {
  const f = join(rootDir, "napcat", "qq-notify.config.json");
  try {
    if (existsSync(f)) {
      const parsed = JSON.parse(readFileSync(f, "utf8"));
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch {}
  return {};
}

// ================= NapCat 检测 =================

const NAPCAT_SIGNATURE = ["index.js", "node.exe"];
const NAPCAT_SHELL_SIGNATURE = ["napcat.mjs", "launcher.bat"];

/** 判断某目录是否是一个合法的 NapCat 部署（Node 版或 Shell 版） */
function isNapcatDir(dir) {
  if (!dir || !existsSync(dir)) return false;
  // Node 版：存在 index.js + node.exe
  let nodeOk = true;
  for (const sig of NAPCAT_SIGNATURE) {
    if (!existsSync(join(dir, sig))) { nodeOk = false; break; }
  }
  if (nodeOk) return true;
  // Shell 版：存在 napcat.mjs + launcher.bat
  for (const sig of NAPCAT_SHELL_SIGNATURE) {
    if (!existsSync(join(dir, sig))) return false;
  }
  return true;
}

/** 内置常见 NapCat 安装位置 */
const KNOWN_NAPCAT_PATHS = [
  join(process.env.HOME || process.env.USERPROFILE || "", "NapCat"),
  join(process.env.LOCALAPPDATA || "", "Programs\\NapCat"),
  "D:\\NapCat", "C:\\NapCat",
  "D:\\Project\\napcat", "D:\\Tools\\napcat",
];

/** 全机扫描 NapCat 实例 */
function scanForNapcat(root = "", maxDepth = 8) {
  const results = [];
  const startDirs = root ? [root] : [
    ...KNOWN_NAPCAT_PATHS,
    ...(process.env.HOME || process.env.USERPROFILE || "") ? [process.env.HOME || process.env.USERPROFILE || ""] : [],
  ];

  function _scan(dir, depth) {
    if (depth > maxDepth || !existsSync(dir)) return;
    try {
      for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        try {
          const st = statSync(fullPath);
          if (st.isDirectory()) {
            const nameLower = entry.toLowerCase();
            if (nameLower === "napcat" || nameLower === "napcatqq" || nameLower.startsWith("napcat")) {
              if (isNapcatDir(fullPath)) results.push({ dir: fullPath, exact: true });
              else _scan(fullPath, depth + 1);
            } else if (depth < maxDepth - 1) {
              _scan(fullPath, depth + 1);
            }
          } else if (entry === "qq.ps1") {
            const parent = dirname(fullPath);
            if (!results.find(r => r.dir === parent)) results.push({ dir: parent, exact: true });
          }
        } catch {}
      }
    } catch {}
  }

  for (const sd of startDirs) _scan(sd, 1);

  const seen = new Set();
  return results.filter(r => { if (seen.has(r.dir)) return false; seen.add(r.dir); return true; });
}

function findNapcatDir(cfg) {
  if (cfg.napcatDir && isNapcatDir(cfg.napcatDir)) return cfg.napcatDir;
  for (const p of KNOWN_NAPCAT_PATHS) { if (isNapcatDir(p)) return p; }
  return KNOWN_NAPCAT_PATHS[0];
}

function apiBase(cfg) { return `http://127.0.0.1:${cfg.apiPort}`; }

async function runQqPs(napcatDir, action, apiPort = 3002) {
  const ps1 = join(napcatDir, "qq.ps1");
  if (existsSync(ps1)) {
    return new Promise((resolve) => {
      const ps = join(process.env.WINDIR || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
      execFile(ps, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1, action], { timeout: 120000 }, (err, stdout) => {
        if (err) resolve(`[qq-napcat] ${action} failed: ${err.message}`);
        else resolve(String(stdout || "").trim());
      });
    });
  }
  // 找 launcher.bat（Node 版在 napcat/ 子目录，Shell 版在根目录）
  let launcherBat = join(napcatDir, "napcat", "launcher.bat");
  if (!existsSync(launcherBat)) launcherBat = join(napcatDir, "launcher.bat");
  if (!existsSync(launcherBat)) return `[qq-napcat] ${action} failed: launcher.bat not found in ${napcatDir}`;

  if (action === "start") {
    if (await isNapcatRunning(apiPort)) return "[qq-napcat] NapCat 已在运行";
    try {
      // 写入 onebot11.json 配置 HTTP API 端口
      const configDir = join(napcatDir, "config");
      mkdirSync(configDir, { recursive: true });
      const onebotConfig = join(configDir, "onebot11.json");
      writeFileSync(onebotConfig, JSON.stringify({
        network: {
          httpServers: [{
            name: "http-server",
            enable: true,
            port: apiPort,
            host: "127.0.0.1",
            enableCors: true,
            enableWebsocket: false,
            messagePostFormat: "array",
            token: "",
            debug: false
          }],
          httpSseServers: [],
          httpClients: [],
          websocketServers: [],
          websocketClients: [],
          plugins: []
        }
      }, null, 2) + "\n", "utf8");
      // 从 webui.json 中读取 token，构造 WebUI URL
      let webuiToken = "";
      try {
        const webuiCfg = JSON.parse(readFileSync(join(napcatDir, "config", "webui.json"), "utf8"));
        if (webuiCfg && webuiCfg.token) webuiToken = webuiCfg.token;
      } catch {}
      // 使用 start 命令打开 launcher.bat，和双击效果完全一样
      const launcherBat = join(napcatDir, "launcher.bat");
      if (!existsSync(launcherBat)) { return "[qq-napcat] 启动失败: 未找到 launcher.bat"; }
      exec(`start "" "${launcherBat}"`, { cwd: napcatDir });
      if (webuiToken) {
        return `[qq-napcat] NapCat 已启动\nWebUI: http://127.0.0.1:6099/webui?token=${webuiToken}`;
      }
      return `[qq-napcat] NapCat 已启动，请用手机 QQ 扫码登录 (WebUI: http://127.0.0.1:6099/webui)`;
    } catch (e) { return `[qq-napcat] 启动失败: ${e.message}`; }
  } else if (action === "stop") {
    // 沙箱内 execSync 不可用，只能用 spawn 丢 taskkill 试试
    spawn("taskkill", ["/IM", "QQ.exe", "/F"], { detached: true, stdio: "ignore" });
    return "[qq-napcat] NapCat 已停止";
  } else if (action === "status") {
    return (await isNapcatRunning(apiPort)) ? "[qq-napcat] NapCat 正在运行" : "[qq-napcat] NapCat 未运行";
  }
  return `[qq-napcat] 未知操作: ${action}`;
}

/** 检查 NapCat 是否在运行 */
async function isNapcatRunning(port = 3002) {
  // 1) 进程级检测（最可靠）——检查 QQ.exe 或 NapCatWinBootMain.exe 是否存在
  try {
    const { stdout } = await execFileP('tasklist', ['/NH', '/FI', 'IMAGENAME eq QQ.exe']);
    if (stdout.includes('QQ.exe')) return true;
  } catch {}
  try {
    const { stdout } = await execFileP('tasklist', ['/NH', '/FI', 'IMAGENAME eq NapCatWinBootMain.exe']);
    if (stdout.includes('NapCatWinBootMain.exe')) return true;
  } catch {}

  // 2) 进程检查失败时，HTTP 端点兜底
  try {
    // OneBot API get_version_info 端点（比根路径 / 更可靠）
    const resp = await fetch(`http://127.0.0.1:${port}/get_version_info`, { signal: AbortSignal.timeout(2000) });
    if (resp.ok) {
      const data = await resp.json();
      if (data && data.status === 'ok') return true;
    }
  } catch {}
  try {
    // WebUI 端口（仅检查端口是否有响应，不依赖具体路径）
    const resp = await fetch("http://127.0.0.1:6099/webui/login", { method: "HEAD", signal: AbortSignal.timeout(2000) });
    if (resp.status !== 502 && resp.status !== 503) return true;
  } catch {}

  return false;
}

// ================= 应用插件 =================
function apply(ctx, config) {
  const mergedConfig = { ...DEFAULTS, ...(config || {}), ...loadFileConfig(discoverRoot()) };
  const cfg = { ...mergedConfig };

  if (!cfg.napcatDir) cfg.napcatDir = findNapcatDir(cfg);

  // ======== qq_send tool ========
  ctx.tools.register(defineTool({
    name: "qq_send",
    description: `Send a private QQ message to the user's main account (${cfg.mainQq}) instantly via the local NapCat bot (OneBot HTTP API at 127.0.0.1:${cfg.apiPort}).`,
    parameters: {
      message: { type: "string", required: true, description: "The exact message text to send to the user's QQ." },
      to: { type: "string", description: `Optional target QQ number. Defaults to the user's main account ${cfg.mainQq}.` }
    },
    output: {
      schema: { type: "object", additionalProperties: false, properties: { status: { type: "string", required: true }, retcode: { type: "integer" }, wording: { type: "string" } } },
      render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }]
    },
    async execute(args) {
      const to = args.to ? Number(args.to) : Number(cfg.mainQq);
      if (!Number.isSafeInteger(to) || to <= 0) throw new Error(`invalid QQ number: ${args.to || cfg.mainQq}`);
      if (!args.message || args.message.trim().length === 0) throw new Error("message must be a non-empty string");
      let resp;
      try {
        resp = await fetch(`${apiBase(cfg)}/send_private_msg`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: to, message: args.message }),
          signal: AbortSignal.timeout(10000)
        });
      } catch (err) {
        throw new Error(`NapCat API unreachable (is NapCat running? try \`qq_napcat action=start\`): ${err && err.message ? err.message : String(err)}`);
      }
      let data;
      try { data = await resp.json(); } catch { throw new Error(`NapCat API returned non-JSON (HTTP ${resp.status})`); }
      if (data.status !== "ok") throw new Error(`QQ send failed: ${data.wording || data.message || data.status || "unknown error"}`);
      return { status: data.status, retcode: typeof data.retcode === "number" ? data.retcode : undefined, wording: data.wording || data.message || "" };
    }
  }));

  // ======== qq_status tool ========
  ctx.tools.register(defineTool({
    name: "qq_status",
    description: "Check NapCat installation status and HTTP API connectivity.",
    parameters: {},
    output: {
      schema: { type: "object", additionalProperties: false, properties: { state: { type: "string", required: true }, running: { type: "boolean", required: true }, logged_in: { type: "boolean" }, apiPort: { type: "integer" }, botUserId: { type: "string" }, botNickname: { type: "string" }, napcatDir: { type: "string" }, details: { type: "string" } } },
      render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }]
    },
    async execute() {
      let installed = false;
      for (const p of KNOWN_NAPCAT_PATHS) { if (isNapcatDir(p)) { cfg.napcatDir = cfg.napcatDir || p; break; } }
      let login = null;
      try { const resp = await fetch(`${apiBase(cfg)}/get_login_info`, { signal: AbortSignal.timeout(5000) }); if (resp.ok) { const data = await resp.json(); if (data.status === "ok") login = data.data; } } catch {}
      const state = login ? "LOGGED_IN" : installed ? "NOT_RUNNING" : "NOT_INSTALLED";
      const lines = [];
      if (!installed && !login) { lines.push("目录: " + (cfg.napcatDir || "未配置")); lines.push("node.exe: ❌"); lines.push("index.js: ❌"); lines.push("HTTP API: 不可达 | Bot: 未安装"); }
      else if (login) { lines.push("✅ NapCat 正在运行并已登录"); lines.push("Bot: " + String(login.user_id) + " (" + (login.nickname || "") + ")"); lines.push("API: http://127.0.0.1:" + cfg.apiPort); }
      else { lines.push("⚠️ NapCat 已安装但未启动"); lines.push("建议: 运行 qq_napcat action=start 启动"); }
      return { state, running: login !== null, logged_in: login !== null, apiPort: cfg.apiPort, ...(login ? { botUserId: String(login.user_id) } : {}), ...(login ? { botNickname: login.nickname } : {}), napcatDir: cfg.napcatDir || "", details: lines.join("\n") };
    }
  }));

  // ======== qq_napcat tool ========
  ctx.tools.register(defineTool({
    name: "qq_napcat",
    description: "Manage the local NapCat QQ bot lifecycle (start/stop/status).",
    parameters: { action: { type: "string", required: true, enum: ["start", "stop", "status"] } },
    output: { schema: { type: "object", additionalProperties: false, properties: { output: { type: "string", required: true } } }, render: (_a, v) => [{ type: "text", text: v.output }] },
    async execute(args) { const output = await runQqPs(cfg.napcatDir, args.action, cfg.apiPort); return { output }; }
  }));

  // ======== qq_detect tool ========
  ctx.tools.register(defineTool({
    name: "qq_detect",
    description: "Detect whether a given directory contains a valid NapCat installation.",
    parameters: { dir: { type: "string", description: "Directory path to check. If omitted, checks current napcatDir setting." } },
    output: { schema: { type: "object", additionalProperties: false, properties: { output: { type: "string", required: true } } }, render: (_a, v) => [{ type: "text", text: v.output }] },
    async execute(args) {
      const dir = args.dir || cfg.napcatDir;
      if (!dir) return { output: "[qq-detect] No directory specified." };
      const hasNodeExe = existsSync(join(dir, "node.exe"));
      const hasIndexJs = existsSync(join(dir, "index.js"));
      const hasConfigJson = existsSync(join(dir, "config.json"));
      const hasNapcatSub = existsSync(join(dir, "napcat")) && statSync(join(dir, "napcat")).isDirectory();
      const isFull = isNapcatDir(dir);
      let lines = [`目录: ${dir}`, `node.exe: ${hasNodeExe ? '✅' : '❌'}`, `index.js: ${hasIndexJs ? '✅' : '❌'}`, `config.json: ${hasConfigJson ? '✅' : '⚠️ (可选)'}`, `napcat/子目录: ${hasNapcatSub ? '✅' : '❌'}`];
      if (isFull) lines.push(`\n✅ 这是一个合法的 NapCat 部署`);
      else { const missing = []; if (!hasNodeExe) missing.push("node.exe"); if (!hasIndexJs) missing.push("index.js"); if (missing.length > 0) lines.push(`\n❌ 缺少关键文件: ${missing.join(", ")}`); }
      return { output: lines.join("\n") };
    }
  }));

  // ======== qq_find tool ========
  ctx.tools.register(defineTool({
    name: "qq_find",
    description: "Auto-scan for all NapCat installations on this machine.",
    parameters: {},
    output: { schema: { type: "object", additionalProperties: false, properties: { output: { type: "string", required: true } } }, render: (_a, v) => [{ type: "text", text: v.output }] },
    async execute() {
      const rootDir = cfg.napcatDir ? dirname(dirname(cfg.napcatDir)) : "";
      const scans = [rootDir, (process.env.HOME || process.env.USERPROFILE || '')].filter(Boolean);
      const allResults = []; const seen = new Set();
      for (const sd of scans) { try { const found = scanForNapcat(sd, 6); for (const r of found) { if (!seen.has(r.dir)) { seen.add(r.dir); allResults.push(r); } } } catch {} }
      for (const kp of KNOWN_NAPCAT_PATHS) { if (isNapcatDir(kp) && !seen.has(kp)) { seen.add(kp); allResults.push({ dir: kp, exact: true }); } }
      if (allResults.length === 0) return { output: "未找到 NapCat 实例。\n请前往 https://github.com/NapNeko/NapCatQQ/releases 下载安装。" };
      const lines = [`找到 ${allResults.length} 个 NapCat 实例:`];
      for (let i = 0; i < allResults.length; i++) { const r = allResults[i]; lines.push(`${i + 1}. ${r.dir}   ${isNapcatDir(r.dir) ? '✅ 结构完整' : '⚠️ 结构不完整'}`); }
      lines.push(`\n=== 建议 ===`); lines.push(`将第一个结果设为默认: qq_config_set napcatDir "${allResults[0].dir}"`);
      return { output: lines.join("\n") };
    }
  }));

  // ======== qq_config_show tool ========
  ctx.tools.register(defineTool({
    name: "qq_config_show",
    description: "Show the current QQ notification configuration.",
    parameters: {},
    output: { schema: { type: "object", additionalProperties: false, properties: { config: { type: "string", required: true } } }, render: (_a, v) => [{ type: "text", text: v.config }] },
    async execute() { const lines = Object.entries(cfg).map(([k, v]) => `  ${k} = ${v}`).join("\n"); return { config: lines }; }
  }));

  // ======== qq_config_set tool ========
  ctx.tools.register(defineTool({
    name: "qq_config_set",
    description: "Set a configuration value for the QQ notification plugin and save it to disk.",
    parameters: { key: { type: "string", required: true, description: "Configuration key to set." }, value: { type: "string", required: true, description: "New value as a string." } },
    output: { schema: { type: "object", additionalProperties: false, properties: { message: { type: "string", required: true } } }, render: (_a, v) => [{ type: "text", text: v.message }] },
    async execute(args) {
      const kv = args.key; const raw = args.value;
      const VALID_KEYS = ["mainQq","apiPort","napcatDir","botQq"];
      if (!VALID_KEYS.includes(kv)) throw new Error("Invalid key. Choose one of: " + VALID_KEYS.join(", "));
      let parsed = raw;
      if (kv === "apiPort") { parsed = Number(raw); if (!Number.isInteger(parsed)) throw new Error("Value must be an integer"); }
      else { parsed = String(raw); }
      cfg[kv] = parsed;
      saveConfig(cfg, discoverRoot());
      return { message: `已更新 ${kv} → ${parsed}` };
    }
  }));

  // ======== qq_deploy tool — 引导用户安装 ========
  ctx.tools.register(defineTool({
    name: "qq_deploy",
    description: "Guide the user to install NapCat Shell and QQ. Points to the official NapCat boot guide.",
    parameters: {},
    output: { schema: { type: "object", additionalProperties: false, properties: { output: { type: "string", required: true } } }, render: (_a, v) => [{ type: "text", text: v.output }] },
    async execute() {
      return {
        output: [
          `📥 NapCat 安装指引`,
          ``,
          `请参考 NapCat 官方引导文档：`,
          `   🔗 https://napneko.github.io/guide/boot/Shell`,
          ``,
          `简要步骤：`,
          `1. 下载 NapCat Shell 版（从 GitHub Release）`,
          `2. 下载并安装 QQNT（从 im.qq.com）`,
          `3. 解压 NapCat 到任意目录`,
          `4. 在 DSH 中配置 NapCat 目录：`,
          `   qq_config_set napcatDir "你的NapCat目录路径"`,
          `5. 启动 NapCat：`,
          `   qq_napcat action=start`,
          `6. 用手机 QQ 扫码登录 (WebUI: http://127.0.0.1:6099/webui)`,
          `7. 配置主号 QQ：`,
          `   qq_config_set mainQq "你的QQ号"`,
        ].join("\n")
      };
    }
  }));

  // ======== Web 路由 ========
  function isLoopback(address) { return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1'; }
  function sendJson(res, status, payload) { const body = JSON.stringify(payload); res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(body) }); res.end(body); }
  function sameOrigin(req) { const origin = req.headers.origin; const host = req.headers.host; if (!origin || !host) return false; try { return new URL(origin).host === host; } catch { return false; } }
  async function readBody(req, maxBytes = 8192) { const chunks = []; let size = 0; for await (const chunk of req) { const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk); size += buf.length; if (size > maxBytes) throw new Error('body too large'); chunks.push(buf); } return Buffer.concat(chunks).toString('utf8'); }

  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: 'exact', path: '/dsh-qq-notify/status',
      handler: async (req, res) => {
        if (req.method !== 'GET' || !isLoopback(req.socket.remoteAddress)) { sendJson(res, req.method === 'GET' ? 403 : 405, { error: 'Request rejected.' }); return; }
        let napcatDir = cfg.napcatDir || '';
        if (!napcatDir || !isNapcatDir(napcatDir)) { for (const p of KNOWN_NAPCAT_PATHS) { if (isNapcatDir(p)) { napcatDir = p; break; } } }
        const installed = isNapcatDir(napcatDir);
        let login = null;
        try { const resp = await fetch(`${apiBase(cfg)}/get_login_info`, { signal: AbortSignal.timeout(5000) }); if (resp.ok) { const data = await resp.json(); if (data.status === 'ok') login = data.data; } } catch {}
        const running = login ? true : await isNapcatRunning(cfg.apiPort);
        const napcatStatus = running ? 'running' : installed ? 'stopped' : 'notInstalled';
        sendJson(res, 200, { config: { mainQq: cfg.mainQq, apiPort: cfg.apiPort, napcatDir: cfg.napcatDir, botQq: cfg.botQq }, napcatStatus, napcatDir, botUserId: login ? String(login.user_id) : null, botNickname: login ? login.nickname : null });
      }
    });
    return dispose;
  }, 'dsh-qq-notify: status route');

  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: 'exact', path: '/dsh-qq-notify/config',
      handler: async (req, res) => {
        if (req.method !== 'POST' || !isLoopback(req.socket.remoteAddress)) { sendJson(res, req.method === 'POST' ? 403 : 405, { error: 'Request rejected.' }); return; }
        let body; try { body = JSON.parse(await readBody(req)); } catch { sendJson(res, 400, { error: 'Invalid JSON.' }); return; }
        if (typeof body !== 'object' || body === null) { sendJson(res, 400, { error: 'Invalid body.' }); return; }
        if (typeof body.mainQq === 'string') cfg.mainQq = body.mainQq;
        if (typeof body.apiPort === 'number') cfg.apiPort = body.apiPort;
        if (typeof body.napcatDir === 'string') cfg.napcatDir = body.napcatDir;
        if (typeof body.botQq === 'string') cfg.botQq = body.botQq;
        saveConfig(cfg, discoverRoot());
        sendJson(res, 200, { ok: true, config: { mainQq: cfg.mainQq, apiPort: cfg.apiPort, napcatDir: cfg.napcatDir, botQq: cfg.botQq } });
      }
    });
    return dispose;
  }, 'dsh-qq-notify: config route');

  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: 'exact', path: '/dsh-qq-notify/napcat',
      handler: async (req, res) => {
        if (req.method !== 'POST' || !isLoopback(req.socket.remoteAddress)) { sendJson(res, req.method === 'POST' ? 403 : 405, { error: 'Request rejected.' }); return; }
        let body; try { body = JSON.parse(await readBody(req)); } catch { sendJson(res, 400, { error: 'Invalid JSON.' }); return; }
        const action = String(body.action || 'status');
        if (!['start','stop','status'].includes(action)) { sendJson(res, 400, { error: `Unknown action: ${action}` }); return; }
        const output = await runQqPs(cfg.napcatDir, action, cfg.apiPort);
        sendJson(res, 200, { message: output });
      }
    });
    return dispose;
  }, 'dsh-qq-notify: napcat route');

  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: 'exact', path: '/dsh-qq-notify/find',
      handler: async (req, res) => {
        if (req.method !== 'GET' || !isLoopback(req.socket.remoteAddress)) { sendJson(res, req.method === 'GET' ? 403 : 405, { error: 'Request rejected.' }); return; }
        const rootDir = cfg.napcatDir ? dirname(dirname(cfg.napcatDir)) : '';
        const scans = [rootDir, (process.env.HOME || process.env.USERPROFILE || '')].filter(Boolean);
        const allResults = []; const seen = new Set();
        for (const sd of scans) { try { const found = scanForNapcat(sd, 6); for (const r of found) { if (!seen.has(r.dir)) { seen.add(r.dir); allResults.push(r); } } } catch {} }
        for (const kp of KNOWN_NAPCAT_PATHS) { if (isNapcatDir(kp) && !seen.has(kp)) { seen.add(kp); allResults.push({ dir: kp, exact: true }); } }
        sendJson(res, 200, { instances: allResults.map((r) => ({ dir: r.dir, valid: isNapcatDir(r.dir) })) });
      }
    });
    return dispose;
  }, 'dsh-qq-notify: find route');

  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: 'exact', path: '/dsh-qq-notify/test',
      handler: async (req, res) => {
        if (req.method !== 'POST' || !isLoopback(req.socket.remoteAddress)) { sendJson(res, req.method === 'POST' ? 403 : 405, { error: 'Request rejected.' }); return; }
        const to = Number(cfg.mainQq);
        if (!Number.isSafeInteger(to) || to <= 0) { sendJson(res, 400, { error: 'Invalid mainQq configuration.' }); return; }
        try { const resp = await fetch(`${apiBase(cfg)}/send_private_msg`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: to, message: '[dsh-qq-notify] 这是一条测试消息 ✓' }), signal: AbortSignal.timeout(10000) }); const data = await resp.json(); sendJson(res, 200, { ok: data.status === 'ok', message: data.status === 'ok' ? 'Test notification sent.' : (data.wording || data.message || 'Send failed.') }); }
        catch (err) { sendJson(res, 200, { ok: false, message: `NapCat API unreachable: ${err?.message ?? err}` }); }
      }
    });
    return dispose;
  }, 'dsh-qq-notify: test route');

  ctx.effect(() => {
    const dispose = ctx.webServer.register({
      kind: 'exact', path: '/dsh-qq-notify/confirm',
      handler: async (req, res) => {
        if (req.method !== 'GET' || !isLoopback(req.socket.remoteAddress)) { sendJson(res, req.method === 'GET' ? 403 : 405, { error: 'Request rejected.' }); return; }
        sendJson(res, 200, { napcatInstalled: isNapcatDir(cfg.napcatDir), napcatRunning: await isNapcatRunning(cfg.apiPort) });
      }
    });
    return dispose;
  }, 'dsh-qq-notify: confirm route');

  console.log(`[qq-notify] active | mainQq=${cfg.mainQq} apiPort=${cfg.apiPort} napcatDir=${cfg.napcatDir}${cfg.botQq ? ` botQq=${cfg.botQq}` : ""}`);
}

export { Config, apply, inject, name };