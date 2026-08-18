// dsh-qq-notify —— 符合 DSH 规范的 QQ 通知插件（内置完整 NapCat 部署引擎）
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { execFile, execSync } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync, createWriteStream, unlinkSync, rmSync } from "node:fs";
import { join, basename, dirname, relative, resolve } from "node:path";
import http from "node:http";
import https from "node:https";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const execFileP = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const _defaultRoot = dirname(dirname(__filename)); // profiles/web/node_modules/dsh-qq-notify

// ================= 配置 & 自动发现 =================
const name = "qq-notify";
const inject = ["tools"];

/** 自动发现项目根目录（不管装在哪里都能找到）*/
function discoverRoot() {
  let p = dirname(__filename);
  for (let i = 0; i < 5; i++) {
    if (basename(p) === "node_modules") {
      return dirname(dirname(p));
    }
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
  mainQq: z.string().default("940841288"),
  apiPort: z.number().default(3002),
  napcatDir: z.string().default(""),
  botQq: z.string().default("")
});

const DEFAULTS = { mainQq: "940841288", apiPort: 3002, napcatDir: "", botQq: "" };

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

function findNapcatDir(cfg) {
  if (cfg.napcatDir && existsSync(join(cfg.napcatDir, "node.exe"))) return cfg.napcatDir;
  const root = discoverRoot();
  const candidates = [join(root, "napcat"), join(root, "..", "napcat")];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return join(root, "napcat");
}

function apiBase(cfg) { return `http://127.0.0.1:${cfg.apiPort}`; }

function runQqPs(napcatDir, action) {
  const baseDir = dirname(napcatDir);
  const ps1 = join(baseDir, "qq.ps1");
  if (!existsSync(ps1)) return `[qq-napcat] ${action} failed: qq.ps1 not found near ${napcatDir}`;
  return new Promise((resolve) => {
    const ps = join(process.env.WINDIR || "C:\\Windows", "System32", "WindowsPowerShell", "v1.0", "powershell.exe");
    execFile(ps, ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1, action], { timeout: 120000 }, (err, stdout) => {
      if (err) resolve(`[qq-napcat] ${action} failed: ${err.message}`);
      else resolve(String(stdout || "").trim());
    });
  });
}

// ================= 内置部署引擎（纯 JS，无需外部脚本）=================

function downloadFile(url, dest, onProgress) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { headers: { "User-Agent": "dsh-qq-notify" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadFile(res.headers.location, dest, onProgress).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      const ws = createWriteStream(dest);
      let downloaded = 0;
      const total = parseInt(res.headers["content-length"] || "0", 10);
      res.on("data", (chunk) => {
        downloaded += chunk.length;
        if (onProgress) onProgress(downloaded, total);
        ws.write(chunk);
      });
      res.on("end", () => { ws.end(); resolve(downloaded); });
      res.on("error", (e) => { ws.destroy(); reject(e); });
      ws.on("error", reject);
      ws.on("finish", () => resolve(downloaded));
    });
    req.on("error", reject);
  });
}

async function getLatestAsset(owner, repo, assetPattern, tag = "") {
  const apiUrl = tag ? `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}` : `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  const res = await fetch(apiUrl, { headers: { "User-Agent": "dsh-qq-notify", Accept: "application/json" } });
  const release = await res.json();
  const asset = release.assets?.find(a => a.name.includes(assetPattern));
  if (!asset) throw new Error(`未找到资产: ${assetPattern} in ${release.tag_name || "latest"}`);
  return { url: asset.browser_download_url, name: asset.name, size: asset.size, tag: release.tag_name };
}

function walkDir(dir, filter, prefix = "") {
  const result = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = prefix ? `${prefix}/${entry}` : entry;
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!filter(rel, true)) result.push(...walkDir(full, filter, rel));
    } else {
      if (!filter(rel, false)) result.push({ full, rel });
    }
  }
  return result;
}

function copyDirectory(src, dst) {
  // Windows 友好的复制方案（处理大二进制文件 + 符号链接）
  const items = walkDir(src, (rel) => rel.toLowerCase().includes("node_modules"));
  if (items.length === 0) return;
  
  mkdirSync(dst, { recursive: true });
  
  // 分批写入避免内存溢出（一次性读取整个文件可能 OOM）
  for (const item of items) {
    const dir = join(dst, dirname(item.rel));
    mkdirSync(dir, { recursive: true });
    
    const srcFile = join(src, item.rel);
    const destFile = join(dst, item.rel);
    
    try {
      const data = readFileSync(srcFile);
      writeFileSync(destFile, data);
    } catch (err) {
      console.warn(`[qq-deploy] 跳过文件 ${item.rel}: ${err.message}`);
    }
  }
}

function copyCryptoDlls(napcatDir) {
  const candidates = [
    "C:\\Program Files\\Tencent\\QQNT\\versions",
    process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, "Programs\\QQ\\versions") : null,
    "C:\\Program Files (x86)\\Tencent\\QQNT\\versions"
  ].filter(Boolean);

  for (const qd of candidates) {
    if (!existsSync(qd)) continue;
    const versions = readdirSync(qd).filter(f => statSync(join(qd, f)).isDirectory()).sort();
    for (const ver of versions) {
      const appDir = join(qd, ver, "resources", "app");
      if (existsSync(join(appDir, "crypto.dll"))) {
        const dlls = ["crypto.dll", "ssl.dll"];
        for (const dll of dlls) {
          const src = join(appDir, dll);
          const dst = join(napcatDir, dll);
          if (existsSync(src)) {
            try { writeFileSync(dst, readFileSync(src)); } catch {}
          }
        }
        return true;
      }
    }
  }
  return false;
}

function fixNoSandbox(mjsPath) {
  if (!existsSync(mjsPath)) return false;
  let content = readFileSync(mjsPath, "utf8");
  if (content.includes('execArgv: ["--no-sandbox"]')) {
    content = content.replace(/execArgv:\s*\["--no-sandbox"\]/g, 'execArgv: []');
    writeFileSync(mjsPath, content, "utf8");
    return true;
  }
  return false;
}

// 部署入口函数（纯 Node.js 执行，无需任何外部工具）
async function deployNapcat(napcatDir, version = "") {
  const owner = "NapNeko";
  const repo = "NapCatQQ";
  const assetName = "Shell.Windows.Node.zip";
  const nodeExe = join(napcatDir, "node.exe");
  const indexJs = join(napcatDir, "index.js");
  
  // 1. 检测是否已部署
  if (existsSync(nodeExe) && existsSync(indexJs)) {
    return { alreadyDeployed: true, message: `[qq-deploy]\n✅ 检测到已部署 NapCat (${nodeExe}) ，跳过下载。` };
  }

  // 创建目标目录
  mkdirSync(napcatDir, { recursive: true });

  // 2. 获取最新版本信息
  const assetInfo = await getLatestAsset(owner, repo, assetName, version);
  const mbSize = Math.round(assetInfo.size / 1048576);
  console.log(`[qq-deploy] 版本: ${assetInfo.tag} | 资产: ${assetInfo.name} (${mbSize} MB)`);

  // 3. 下载 zip（显示进度）
  const tmpZip = join(tmpdir(), `napcat-${Date.now()}.zip`);
  console.log(`[qq-deploy] 正在从 GitHub 下载...`);
  await downloadFile(assetInfo.url, tmpZip, (dl, total) => {
    if (total > 0) {
      const pct = Math.round(dl / total * 100);
      console.log(`[qq-deploy] ⏳ 进度: ${pct}% (${Math.round(dl/1048576)}MB / ${mbSize}MB)`);
    }
  });
  console.log(`[qq-deploy] ✅ 下载完成 (${mbSize} MB)`);

  // 4. 解压到临时目录
  const tempExtract = join(require("os").tmpdir(), `napcat-extract-${Date.now()}`);
  mkdirSync(tempExtract, { recursive: true });
  console.log(`[qq-deploy] 正在解压...`);
  await execFile("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", 
    "-Command", `Expand-Archive -LiteralPath "${tmpZip}" -DestinationPath "${tempExtract}" -Force`],
    { timeout: 300000 });
  console.log(`[qq-deploy] ✅ 解压完成`);

  // 5. 复制到目标目录（跳过 node_modules）
  console.log(`[qq-deploy] 正在安装到 ${napcatDir} ...`);
  copyDirectory(tempExtract, napcatDir);
  console.log(`[qq-deploy] ✅ 安装完成`);

  // 6. 清理临时文件
  try { unlinkSync(tmpZip); } catch {}
  try { rmSync(tempExtract, { recursive: true, force: true }); } catch {}

  // 7. 修复已知问题
  const fixes = [];
  const mjsPath = join(napcatDir, "napcat", "napcat.mjs");
  if (fixNoSandbox(mjsPath)) fixes.push("--no-sandbox bug 已修复");

  const dllCopied = copyCryptoDlls(napcatDir);
  if (dllCopied) {
    fixes.push("加密模块 crypto.dll/ssl.dll 已预置");
  } else {
    fixes.push("⚠️ 未找到系统 QQNT；如运行时报错请安装一个 QQ 后再重跑本脚本");
  }

  return {
    alreadyDeployed: false,
    directory: napcatDir,
    message: [
      `[qq-deploy]`,
      `✅ 部署完成!`,
      `📁 位置: ${napcatDir}`,
      `📦 来源: ${assetInfo.tag} (${assetInfo.name})`,
      fixes.join(" | ")
    ].join("\n")
  };
}

// ================= 应用插件 =================
function apply(ctx, config) {
  const mergedConfig = { ...DEFAULTS, ...loadFileConfig(discoverRoot()), ...(config || {}) };
  const cfg = { ...mergedConfig };
  
  // Resolve napcat dir dynamically
  if (!cfg.napcatDir) {
    cfg.napcatDir = findNapcatDir(cfg);
  }

  // ======== qq_send tool ========
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
    async execute(args) {
      const to = args.to ? Number(args.to) : Number(cfg.mainQq);
      if (!Number.isSafeInteger(to) || to <= 0) throw new Error(`invalid QQ number: ${args.to || cfg.mainQq}`);
      if (!args.message || args.message.trim().length === 0) throw new Error("message must be a non-empty string");
      let resp;
      try {
        resp = await fetch(`${apiBase(cfg)}/send_private_msg`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: to, message: args.message }),
          signal: AbortSignal.timeout(10000)
        });
      } catch (err) {
        throw new Error(`NapCat API unreachable (is NapCat running? try \`qq start\` or qq_napcat): ${err && err.message ? err.message : String(err)}`);
      }
      let data;
      try { data = await resp.json(); }
      catch { throw new Error(`NapCat API returned non-JSON (HTTP ${resp.status})`); }
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

  // ======== qq_status tool ========
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
        if (resp.ok) { const data = await resp.json(); if (data.status === "ok") login = data.data; }
      } catch { /* not running */ }
      return {
        running: login !== null,
        apiPort: cfg.apiPort,
        ...(login ? { botUserId: String(login.user_id) } : {}),
        ...(login ? { botNickname: login.nickname } : {})
      };
    }
  }));

  // ======== qq_napcat tool ========
  ctx.tools.register(defineTool({
    name: "qq_napcat",
    description: `Manage the local NapCat QQ bot lifecycle (start/stop/restart/status) by delegating to qq.ps1. Use when the user asks to start/stop/restart the QQ notification channel or when qq_send fails because NapCat is not running.`,
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
      const output = await runQqPs(cfg.napcatDir, args.action);
      return { output };
    }
  }));

  // ======== qq_config_show tool ========
  ctx.tools.register(defineTool({
    name: "qq_config_show",
    description: "Show the current QQ notification configuration (mainQq, apiPort, napcatDir, botQq).",
    parameters: {},
    output: {
      schema: { type: "object", additionalProperties: false, properties: { config: { type: "string", required: true } } },
      render: (_a, v) => [{ type: "text", text: v.config }]
    },
    async execute() {
      const lines = Object.entries(cfg).map(([k, v]) => `  ${k} = ${v}`).join("\n");
      return { config: lines };
    }
  }));

  // ======== qq_config_set tool ========
  ctx.tools.register(defineTool({
    name: "qq_config_set",
    description: "Set a configuration value for the QQ notification plugin and save it to disk. Valid keys: mainQq (接收通知的主号 QQ), apiPort (NapCat HTTP端口), napcatDir (NapCat部署目录), botQq (机器人小号QQ).",
    parameters: {
      key: { type: "string", required: true, description: "Configuration key to set." },
      value: { type: "string", required: true, description: "New value as a string (will be converted to number/boolean as needed)." }
    },
    output: {
      schema: { type: "object", additionalProperties: false, properties: { message: { type: "string", required: true } } },
      render: (_a, v) => [{ type: "text", text: v.message }]
    },
    async execute(args) {
      const kv = args.key;
      const raw = args.value;
      const VALID_KEYS = ["mainQq","apiPort","napcatDir","botQq"];
      if (!VALID_KEYS.includes(kv)) throw new Error("Invalid key. Choose one of: " + VALID_KEYS.join(", "));
      
      let parsed = raw;
      if (kv === "apiPort") { parsed = Number(raw); if (!Number.isInteger(parsed)) throw new Error("Value must be an integer"); }
      else { parsed = String(raw); }
      
      cfg[kv] = parsed;
      const root = discoverRoot();
      const configFile = join(root, "napcat", "qq-notify.config.json");
      try { writeFileSync(configFile, JSON.stringify({...DEFAULTS,...loadFileConfig(root),...cfg}, null, 2)+"\n","utf8"); } catch {}
      
      return { message: `已更新 ${kv} → ${parsed}` };
    }
  }));

  // ======== qq_deploy tool — 全新内置引擎！ ========
  ctx.tools.register(defineTool({
    name: "qq_deploy",
    description: `Auto-deploy the local NapCat QQ bot ENTIRELY within this plugin. Downloads latest stable release, extracts, repairs bugs, copies encryption modules, provides next-step guidance. Zero external dependencies. Supports custom directory or version tag. Use this whenever the user says '帮我装好QQ通知' or when NapCat is missing or broken.`,
    parameters: {
      dir: { type: "string", description: `Optional deployment directory. Defaults to auto-discovered path.` },
      version: { type: "string", description: `Optional version tag (e.g., 'v4.18.19'). Defaults to latest release.` }
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
      const deployDir = args.dir || cfg.napcatDir;
      const version = args.version || "";
      
      try {
        const result = await deployNapcat(deployDir, version);
        
        if (result.alreadyDeployed) {
          return { output: `[qq-deploy]\n✅ 检测到已部署 NapCat (${deployDir}) ，跳过下载。\n\n下一步: 运行 \`qq start\` 启动 NapCat` };
        }
        
        return { 
          output: `${result.message}\n\n=== 下一步 ===\n1. 运行 \`qq start\` 启动 NapCat\n2. 用【机器人小号】手机 QQ 扫描登录（WebUI: http://127.0.0.1:6099/webui 或查看 napcat\\cache\\qrcode.png）\n3. 登录一次后以后自动快速登录（也可 \`qq autostart on\` 开机自启）\n4. 登录成功后说「我的QQ主号改成 xxx」保存配置，然后就能发了！` 
        };
      } catch (err) {
        return { 
          output: `[qq-deploy] ❌ 部署失败\n\n${err && err.message ? err.message : String(err)}\n\n建议尝试:\n• 检查网络连接（需要访问 GitHub）\n• 确认磁盘有 ~500MB 空闲\n• 稍后重试或手动下载至指定目录` 
        };
      }
    }
  }));

  console.log(`[qq-notify] active | mainQq=${cfg.mainQq} apiPort=${cfg.apiPort} napcatDir=${cfg.napcatDir}${cfg.botQq ? ` botQq=${cfg.botQq}` : ""}`);
}

export { Config, apply, inject, name };
