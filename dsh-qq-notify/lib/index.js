// dsh-qq-notify —— 符合 DSH 规范的 QQ 通知插件（含配置机制 + 网页控制面板）
// 工具:
//   qq_send       向主号 QQ 发送私聊消息（NapCat OneBot HTTP API）
//   qq_status     查询 NapCat 在线状态 / 登录账号
//   qq_napcat     管理 NapCat 生命周期（start/stop/restart/status）
//   qq_deploy     NapCat 自动部署引导（下载/解压/修复/扫码提示）
// 网页面板: http://127.0.0.1:3003（发消息/看状态/启停 NapCat）
// 配置（优先级: 宿主组合 config > qq-notify.config.json > 内置默认）:
//   mainQq         接收通知的主号 QQ（默认 940841288）
//   apiPort        NapCat OneBot HTTP 端口（默认 3002）
//   napcatDir      NapCat 部署目录（默认 D:\Project\qq-remote-deploy\napcat）
//   botQq          机器人小号 QQ（默认空 = 自动从 get_login_info 查询）
//   webPanelPort   网页面板端口（默认 3003）
//   webPanelEnabled 是否启用网页面板（默认 true，挂载于 DSH 现有 Web 服务 /qq-panel，零新增端口）
// 配置文件: 部署目录下 qq-notify.config.json（用户可直接编辑）
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const execFileP = promisify(execFile);

const name = "qq-notify";
const inject = ["tools", "webServer"];

const QQ_DIR = "D:\\Project\\qq-remote-deploy";
const CONFIG_FILE = join(QQ_DIR, "qq-notify.config.json");
const PANEL_PATH = "/qq-panel";

/** Schemastery configuration: exposed via the host composition (cordis.patch.yml config) */
const Config = z.object({
  mainQq: z.string().default("940841288"),
  apiPort: z.number().default(3002),
  napcatDir: z.string().default(join(QQ_DIR, "napcat")),
  botQq: z.string().default(""),
  webPanelEnabled: z.boolean().default(true)
});

const DEFAULTS = {
  mainQq: "940841288",
  apiPort: 3002,
  napcatDir: join(QQ_DIR, "napcat"),
  botQq: "",
  webPanelEnabled: true
};

const description =
  "QQ notification & NapCat management for the user's main account via the local NapCat bot. " +
  "Use qq_send whenever the user asks to send or notify something through QQ (e.g. \"用QQ发：...\", \"发QQ消息：...\", \"QQ通知我\", \"notify me on QQ\"). " +
  "qq_status checks whether NapCat is online; qq_napcat starts/stops/restarts it.";

function loadFileConfig() {
  try {
    if (existsSync(CONFIG_FILE)) {
      const parsed = JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
      if (parsed && typeof parsed === "object") return parsed;
    }
  } catch { /* invalid file -> fall through to defaults */ }
  return {};
}

function apiBase(cfg) {
  return `http://127.0.0.1:${cfg.apiPort}`;
}

function runQqPs(cfg, action) {
  return new Promise((resolve) => {
    const ps = join(process.env.WINDIR || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    execFileP(ps, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(QQ_DIR, "qq.ps1"), action], { timeout: 120000 })
      .then(({ stdout }) => resolve(String(stdout || "").trim()))
      .catch((err) => resolve(`[qq-napcat] ${action} failed: ${err && err.message ? err.message : String(err)}`));
  });
}

function apply(ctx, config) {
  const cfg = { ...DEFAULTS, ...loadFileConfig(), ...(config || {}) };

  ctx.tools.register(defineTool({
    name: "qq_send",
    description: `Send a private QQ message to the user's main account (${cfg.mainQq}) instantly via the local NapCat bot (OneBot HTTP API at 127.0.0.1:${cfg.apiPort}). Use this whenever the user asks to send or notify something through QQ.`,
    parameters: {
      message: { type: "string", required: true, description: "The exact message text to send to the user's QQ." },
      to: { type: "string", description: `Optional target QQ number. Defaults to the user's main account ${cfg.mainQq}.` }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          status: { type: "string", required: true },
          retcode: { type: "integer" },
          wording: { type: "string" }
        }
      },
      render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }]
    },
    async execute(args, exec) {
      const to = args.to ? Number(args.to) : Number(cfg.mainQq);
      if (!Number.isSafeInteger(to) || to <= 0) throw new Error(`invalid QQ number: ${args.to || cfg.mainQq}`);
      if (!args.message || args.message.trim().length === 0) throw new Error("message must be a non-empty string");
      let resp;
      try {
        resp = await fetch(`${apiBase(cfg)}/send_private_msg`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: to, message: args.message }),
          signal: exec.signal
        });
      } catch (err) {
        throw new Error(`NapCat API unreachable (is NapCat running? try \`qq start\` or qq_napcat): ${err && err.message ? err.message : String(err)}`);
      }
      let data;
      try {
        data = await resp.json();
      } catch {
        throw new Error(`NapCat API returned non-JSON (HTTP ${resp.status})`);
      }
      if (data.status !== "ok") {
        throw new Error(`QQ send failed: ${data.wording || data.message || data.status || "unknown error"}`);
      }
      return {
        status: data.status,
        retcode: typeof data.retcode === "number" ? data.retcode : undefined,
        wording: data.wording || data.message || ""
      };
    }
  }));

  ctx.tools.register(defineTool({
    name: "qq_status",
    description: `Check whether the local NapCat QQ bot is running and logged in (HTTP API 127.0.0.1:${cfg.apiPort}). Returns running state and the logged-in bot account.`,
    parameters: {},
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          running: { type: "boolean", required: true },
          apiPort: { type: "integer" },
          botUserId: { type: "string" },
          botNickname: { type: "string" }
        }
      },
      render: (_args, value) => [{ type: "text", text: JSON.stringify(value) }]
    },
    async execute() {
      let login = null;
      try {
        const resp = await fetch(`${apiBase(cfg)}/get_login_info`, { signal: AbortSignal.timeout(5000) });
        if (resp.ok) {
          const data = await resp.json();
          if (data.status === "ok") login = data.data;
        }
      } catch { /* not running */ }
      return {
        running: login !== null,
        apiPort: cfg.apiPort,
        ...(login ? { botUserId: String(login.user_id) } : {}),
        ...(login ? { botNickname: login.nickname } : {})
      };
    }
  }));

  ctx.tools.register(defineTool({
    name: "qq_napcat",
    description: `Manage the local NapCat QQ bot lifecycle (start/stop/restart/status) by delegating to qq.ps1 (hidden-window launch; NapCat directory: ${cfg.napcatDir}). Use when the user asks to start/stop/restart the QQ notification channel or when qq_send fails because NapCat is not running.`,
    parameters: {
      action: { type: "string", required: true, enum: ["start", "stop", "restart", "status"] }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          output: { type: "string", required: true }
        }
      },
      render: (_args, value) => [{ type: "text", text: value.output }]
    },
    async execute(args) {
      if (!existsSync(join(QQ_DIR, "qq.ps1"))) throw new Error(`qq.ps1 not found at ${join(QQ_DIR, "qq.ps1")}`);
      const output = await runQqPs(cfg, args.action);
      return { output };
    }
  }));

  ctx.tools.register(defineTool({
    name: "qq_deploy",
    description: `Auto-deploy/repair the local NapCat QQ bot: if no NapCat exists at the configured napcatDir (${cfg.napcatDir}), downloads NapCat Shell (Windows Node) from GitHub Releases, extracts it, applies the crypto/ssl.dll fix, and prints scan-login guidance. Use when NapCat is missing or broken (e.g. qq_status shows not running after qq start).`,
    parameters: {
      dir: { type: "string", description: `Optional custom deployment directory. Defaults to ${cfg.napcatDir}.` }
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          output: { type: "string", required: true }
        }
      },
      render: (_args, value) => [{ type: "text", text: value.output }]
    },
    async execute(args) {
      const deployPs = join(QQ_DIR, "qq-deploy.ps1");
      if (!existsSync(deployPs)) throw new Error(`qq-deploy.ps1 not found at ${deployPs}`);
      const psArgs = ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", deployPs];
      if (args.dir) psArgs.push("-Dir", args.dir);
      const output = await new Promise((resolve) => {
        const ps = join(process.env.WINDIR || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
        execFileP(ps, psArgs, { timeout: 600000, maxBuffer: 8 * 1024 * 1024 })
          .then(({ stdout }) => resolve(String(stdout || "").trim()))
          .catch((err) => resolve(`[qq_deploy] failed: ${err && err.message ? err.message : String(err)}`));
      });
      return { output };
    }
  }));

  if (cfg.webPanelEnabled !== false) mountWebPanel(ctx, cfg);
  console.log(`[qq-notify] active | mainQq=${cfg.mainQq} apiPort=${cfg.apiPort} napcatDir=${cfg.napcatDir}${cfg.botQq ? ` botQq=${cfg.botQq}` : ""} panel=${PANEL_PATH}`);
}

// ================= 网页控制面板（挂在 DSH 现有 Web 服务上，零新增端口）=================
function mountWebPanel(ctx, cfg) {
  const webServer = ctx.webServer;
  if (!webServer || typeof webServer.register !== "function") {
    console.log("[qq-notify] webServer 服务不可用，网页面板未挂载（工具不受影响）");
    return;
  }
  try {
    ctx.effect(() => webServer.register({
      kind: "exact",
      path: PANEL_PATH,
      handler: async (req, res) => {
        try {
          const url = new URL(req.url || "/", "http://dsh");
          const path = url.pathname;
          res.setHeader("Cache-Control", "no-store");

          // 页面
          if (req.method === "GET" && (path === PANEL_PATH || path === PANEL_PATH + "/")) {
            res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            res.end(PANEL_HTML);
            return;
          }
          // 状态
          if (req.method === "GET" && path === PANEL_PATH + "/api/status") {
            let login = null;
            try {
              const resp = await fetch(`${apiBase(cfg)}/get_login_info`, { signal: AbortSignal.timeout(5000) });
              if (resp.ok) { const d = await resp.json(); if (d.status === "ok") login = d.data; }
            } catch { /* offline */ }
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              running: login !== null,
              apiPort: cfg.apiPort,
              mainQq: cfg.mainQq,
              botUserId: login ? login.user_id : null,
              botNickname: login ? login.nickname : null,
              panelPath: PANEL_PATH
            }));
            return;
          }
          // 发送
          if (req.method === "POST" && path === PANEL_PATH + "/api/send") {
            const body = JSON.parse(await readBody(req));
            const message = String(body.message || "").trim();
            const to = body.to ? Number(body.to) : Number(cfg.mainQq);
            if (!message) { res.writeHead(400, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false, error: "消息为空" })); return; }
            try {
              const resp = await fetch(`${apiBase(cfg)}/send_private_msg`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: to, message })
              });
              const data = await resp.json();
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: data.status === "ok", status: data.status, wording: data.wording || data.message || "" }));
            } catch (err) {
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: false, error: `NapCat 未运行或端口不通: ${err.message || err}` }));
            }
            return;
          }
          // NapCat 管理
          if (req.method === "POST" && path === PANEL_PATH + "/api/napcat") {
            const body = JSON.parse(await readBody(req));
            const action = String(body.action || "status");
            if (!["start", "stop", "restart", "status"].includes(action)) {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: false, error: `未知操作: ${action}` }));
              return;
            }
            const output = await runQqPs(cfg, action);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, output }));
            return;
          }
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("404 not found");
        } catch (err) {
          try {
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: String(err && err.message || err) }));
          } catch { /* response already sent */ }
        }
      }
    }), "qq-notify panel route");
    console.log(`[qq-notify] 网页控制面板已挂载: ${PANEL_PATH}（DSH Web 服务内，无独立端口）`);
  } catch (err) {
    console.log(`[qq-notify] 网页面板挂载失败: ${err && err.message ? err.message : err}（工具不受影响）`);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; if (data.length > 1e6) { req.destroy(); reject(new Error("body too large")); } });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

const PANEL_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>QQ 通知控制台</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Microsoft YaHei", system-ui, sans-serif; background: #f5f6fa; color: #2c3e50; padding: 24px; }
  .wrap { max-width: 640px; margin: 0 auto; }
  h1 { font-size: 22px; margin-bottom: 4px; }
  .sub { color: #7f8c8d; font-size: 13px; margin-bottom: 20px; }
  .card { background: #fff; border-radius: 10px; padding: 18px; margin-bottom: 16px; box-shadow: 0 1px 4px rgba(0,0,0,.08); }
  .card h2 { font-size: 15px; margin-bottom: 12px; color: #34495e; }
  .row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  .badge.ok { background: #e8f8ef; color: #1e8449; }
  .badge.bad { background: #fdecea; color: #c0392b; }
  .kv { font-size: 13px; color: #555; line-height: 1.9; }
  .kv b { color: #2c3e50; }
  textarea, input[type=text] { width: 100%; border: 1px solid #dcdde1; border-radius: 6px; padding: 10px; font-size: 14px; font-family: inherit; resize: vertical; }
  textarea { min-height: 84px; margin-bottom: 10px; }
  .btn { border: none; border-radius: 6px; padding: 9px 18px; font-size: 14px; cursor: pointer; color: #fff; }
  .btn.primary { background: #2e86de; }
  .btn.success { background: #1e8449; }
  .btn.danger { background: #c0392b; }
  .btn.warn { background: #e67e22; }
  .btn.ghost { background: #95a5a6; }
  .btn:disabled { opacity: .55; cursor: not-allowed; }
  .out { background: #f8f9fa; border: 1px solid #eef0f2; border-radius: 6px; padding: 10px; font-family: Consolas, monospace; font-size: 12px; white-space: pre-wrap; max-height: 200px; overflow: auto; color: #34495e; }
  .msg { font-size: 13px; margin-top: 8px; }
  .msg.ok { color: #1e8449; }
  .msg.err { color: #c0392b; }
  .tip { font-size: 12px; color: #95a5a6; margin-top: 8px; }
</style>
</head>
<body>
<div class="wrap">
  <h1>💬 QQ 通知控制台</h1>
  <div class="sub">dsh-qq-notify · 通过本机 NapCat 机器人发送 QQ 私聊通知</div>

  <div class="card">
    <div class="row" style="justify-content: space-between;">
      <h2 style="margin:0;">通道状态</h2>
      <span id="badge" class="badge bad">检测中…</span>
    </div>
    <div class="kv" id="statusInfo" style="margin-top:10px;">加载中…</div>
  </div>

  <div class="card">
    <h2>发送 QQ 消息</h2>
    <input type="text" id="to" placeholder="接收 QQ 号（留空 = 主号 940841288）">
    <textarea id="message" placeholder="输入要发送的消息内容…"></textarea>
    <button class="btn primary" id="sendBtn" onclick="sendMsg()">发送</button>
    <div class="msg" id="sendResult"></div>
  </div>

  <div class="card">
    <h2>NapCat 管理</h2>
    <div class="row">
      <button class="btn success" onclick="napcat('start')">启动</button>
      <button class="btn danger" onclick="napcat('stop')">停止</button>
      <button class="btn warn" onclick="napcat('restart')">重启</button>
      <button class="btn ghost" onclick="napcat('status')">刷新状态</button>
    </div>
    <div class="out" id="napcatOut" style="margin-top:12px;">（操作输出会显示在这里）</div>
  </div>
</div>
<script>
async function j(f){ const r = await fetch(f, {headers:{'Accept':'application/json'}}); return r.json(); }
async function post(f, b){ const r = await fetch(f, {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(b)}); return r.json(); }
async function refresh(){
  const s = await j('${PANEL_PATH}/api/status');
  const badge = document.getElementById('badge');
  badge.className = 'badge ' + (s.running ? 'ok' : 'bad');
  badge.textContent = s.running ? '在线' : '离线';
  document.getElementById('statusInfo').innerHTML =
    '<b>NapCat:</b> ' + (s.running ? '运行中' : '未运行') +
    ' &nbsp;|&nbsp; <b>机器人:</b> ' + (s.botUserId ? s.botUserId + (s.botNickname ? ' (' + s.botNickname + ')' : '') : '—') +
    '<br><b>API 端口:</b> ' + s.apiPort + ' &nbsp;|&nbsp; <b>主号:</b> ' + s.mainQq;
}
async function sendMsg(){
  const el = document.getElementById('sendResult');
  const btn = document.getElementById('sendBtn');
  btn.disabled = true; el.className = 'msg'; el.textContent = '发送中…';
  try {
    const r = await post('${PANEL_PATH}/api/send', { message: document.getElementById('message').value, to: document.getElementById('to').value || undefined });
    if (r.ok) { el.className = 'msg ok'; el.textContent = '✅ 已发送' + (r.wording ? '（' + r.wording + '）' : ''); document.getElementById('message').value = ''; }
    else { el.className = 'msg err'; el.textContent = '❌ ' + (r.error || r.wording || '发送失败'); }
  } catch(e){ el.className = 'msg err'; el.textContent = '❌ 请求出错: ' + e; }
  btn.disabled = false;
  refresh();
}
async function napcat(action){
  const out = document.getElementById('napcatOut');
  out.textContent = '执行 ' + action + ' …（NapCat 启动约需 20 秒）';
  const r = await post('${PANEL_PATH}/api/napcat', { action });
  out.textContent = r.output || (r.error || '（无输出）');
  refresh();
}
refresh();
setInterval(refresh, 10000);
</script>
</body>
</html>`;

export { Config, apply, inject, name };
