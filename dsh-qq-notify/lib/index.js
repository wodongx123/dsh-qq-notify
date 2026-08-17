// dsh-qq-notify —— 符合 DSH 规范的 QQ 通知插件（含配置机制）
// 工具:
//   qq_send       向主号 QQ 发送私聊消息（NapCat OneBot HTTP API）
//   qq_status     查询 NapCat 在线状态 / 登录账号
//   qq_napcat     管理 NapCat 生命周期（start/stop/restart/status）
// 配置（优先级: 宿主组合 config > qq-notify.config.json > 内置默认）:
//   mainQq    接收通知的主号 QQ（默认 940841288）
//   apiPort   NapCat OneBot HTTP 端口（默认 3002）
//   napcatDir NapCat 部署目录（默认 D:\Project\qq-remote-deploy\napcat）
//   botQq     机器人小号 QQ（默认空 = 自动从 get_login_info 查询）
// 配置文件: 部署目录下 qq-notify.config.json（用户可直接编辑）
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const execFileP = promisify(execFile);

const name = "qq-notify";
const inject = ["tools"];

const QQ_DIR = "D:\\Project\\qq-remote-deploy";
const CONFIG_FILE = join(QQ_DIR, "qq-notify.config.json");

/** Schemastery configuration: exposed via the host composition (cordis.patch.yml config) */
const Config = z.object({
  mainQq: z.string().default("940841288"),
  apiPort: z.number().default(3002),
  napcatDir: z.string().default(join(QQ_DIR, "napcat")),
  botQq: z.string().default("")
});

const DEFAULTS = {
  mainQq: "940841288",
  apiPort: 3002,
  napcatDir: join(QQ_DIR, "napcat"),
  botQq: ""
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

  console.log(`[qq-notify] active | mainQq=${cfg.mainQq} apiPort=${cfg.apiPort} napcatDir=${cfg.napcatDir}${cfg.botQq ? ` botQq=${cfg.botQq}` : ""}`);
}

export { Config, apply, inject, name };
