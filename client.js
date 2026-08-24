window.__ModuleLoader__.load({
  id: 'dsh-qq-notify',
  factory: (require) => {
    const module = { exports: {} }
    const exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })
    const React = require('react')

    const NS = 'settings.qqNotify'

    const en = {
      nav: 'QQ Notification',
      title: 'QQ Notification',
      intro: 'Send notifications to your QQ via the local NapCat bot. Configure the main QQ number, API port, and NapCat directory below.',
      statusFailed: 'Could not read the QQ notification status.',
      saveFailed: 'Could not save configuration.',
      mainQq: 'Main QQ',
      mainQqDesc: 'The QQ number that receives notifications.',
      apiPort: 'API port',
      apiPortDesc: 'NapCat HTTP API port (default 3002).',
      napcatDir: 'NapCat directory',
      napcatDirDesc: 'Path to the NapCat deployment directory.',
      botQq: 'Bot QQ',
      botQqDesc: 'The bot QQ number (optional, auto-detected if empty).',
      napcatStatus: 'NapCat status',
      running: 'Running',
      stopped: 'Stopped',
      notInstalled: 'Not installed',
      unknown: 'Unknown',
      testSend: 'Send test notification',
      testSent: 'Test notification sent.',
      testFailed: 'Could not send test notification.',
      startNapcat: 'Start NapCat',
      stopNapcat: 'Stop NapCat',
      restartNapcat: 'Restart NapCat',
      actionBusy: 'Working…',
      configSaved: 'Configuration saved.',
      deploy: 'Deploy NapCat',
      deployDesc: 'Automatically download and install NapCat in a local directory.',
      save: 'Save',
      scanNapcat: 'Scan for NapCat',
      scanning: 'Scanning…',
      foundInstances: 'Found instances',
      useThis: 'Use this',
      noInstances: 'No NapCat instances found. Use the agent tool "qq_deploy" to install.',
      setInstance: 'Select an instance to set as NapCat directory',
      tipTitle: '💡 NapCat installation guide',
      tipLine1: 'Tell the agent in the conversation:',
      tipCmd: '"帮我装好QQ通知"',
      tipLine2: 'It will automatically download, extract, fix bugs, and guide you through QR-code login.',
      tipMore: 'See README for all available commands.',
      tipMoreLink: 'https://github.com/wodongx123/dsh-qq-notify/blob/main/dsh-qq-notify/README.md'
    }

    const zh = {
      nav: 'QQ 通知',
      title: 'QQ 通知',
      intro: '通过本机 NapCat 机器人向你的 QQ 发送通知。以下配置主号 QQ、API 端口和 NapCat 部署目录。',
      statusFailed: '无法读取 QQ 通知状态。',
      saveFailed: '无法保存配置。',
      mainQq: '主号 QQ',
      mainQqDesc: '接收通知的主 QQ 号码。',
      apiPort: 'API 端口',
      apiPortDesc: 'NapCat HTTP API 端口（默认 3002）。',
      napcatDir: 'NapCat 目录',
      napcatDirDesc: 'NapCat 部署目录的路径。',
      botQq: '机器人 QQ',
      botQqDesc: '机器人小号 QQ（可选，留空自动检测）。',
      napcatStatus: 'NapCat 状态',
      running: '运行中',
      stopped: '已停止',
      notInstalled: '未安装',
      unknown: '未知',
      testSend: '发送测试通知',
      testSent: '测试通知已发送。',
      testFailed: '无法发送测试通知。',
      startNapcat: '启动 NapCat',
      stopNapcat: '停止 NapCat',
      restartNapcat: '重启 NapCat',
      actionBusy: '处理中…',
      configSaved: '配置已保存。',
      deploy: '部署 NapCat',
      deployDesc: '自动下载安装 NapCat 到本地目录。',
      save: '保存',
      scanNapcat: '扫描 NapCat',
      scanning: '扫描中…',
      foundInstances: '找到的实例',
      useThis: '使用此目录',
      noInstances: '未找到任何 NapCat 实例。请使用 agent 工具 "qq_deploy" 安装。',
      setInstance: '选择一个实例设为 NapCat 目录',
      tipTitle: '💡 NapCat 安装指引',
      tipCmd: '「帮我装好QQ通知」',
      tipLine1: '在对话中对 Agent 说：',
      tipLine2: '即可自动下载解压、修复 bug、引导扫码登录。',
      tipMore: '更多指令见 README。',
      tipMoreLink: 'https://github.com/wodongx123/dsh-qq-notify/blob/main/dsh-qq-notify/README.md'
    }

    const css = `
      .qqNotifySection{box-sizing:border-box;max-width:720px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:16px}
      .qqNotifyTitle{margin:0;font-size:20px;font-weight:600;line-height:30px}
      .qqNotifyIntro{margin:0;color:var(--dsw-alias-label-secondary);font-size:14px;line-height:22px}
      .qqNotifyCard{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-module-platform);border-radius:14px;padding:6px 22px;display:flex;flex-direction:column}
      .qqNotifyRow{display:flex;align-items:flex-start;gap:16px;padding:12px 0;border-bottom:1px solid var(--dsw-alias-border-l2)}
      .qqNotifyRow:last-child{border-bottom:none}
      .qqNotifyRowText{min-width:0;flex:1;display:flex;flex-direction:column;gap:3px}
      .qqNotifyRowTitle{font-size:14px;font-weight:600;line-height:22px}
      .qqNotifyRowDesc{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px}
      .qqNotifyRowValue{font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary, #1f2328);flex:none;text-align:right;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace}
      .qqNotifyActions{display:flex;flex-wrap:wrap;align-items:center;gap:10px;padding:12px 0 4px}
      .qqNotifyButton{font:inherit;display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 14px;border:1px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:13px;cursor:pointer;white-space:nowrap;transition:background 120ms ease,border-color 120ms ease}
      .qqNotifyButton:hover{background:var(--dsw-alias-bg-module-platform)}
      .qqNotifyButton:disabled{opacity:0.5;cursor:default}
      .qqNotifyPrimary{border-color:var(--dsw-alias-button-primary-fill);background:var(--dsw-alias-button-primary-fill);color:var(--dsw-alias-label-primary-foreground)}
      .qqNotifyPrimary:hover{opacity:.9}
      .qqNotifyPill{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:24px}
      .qqNotifyPill[data-tone='ok']{color:var(--dsw-alias-state-success-primary,#2f9e44);border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary,#2f9e44) 35%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#2f9e44) 10%,transparent)}
      .qqNotifyPill[data-tone='bad']{color:var(--dsw-alias-state-error-primary,#e03131);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e03131) 35%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#e03131) 10%,transparent)}
      .qqNotifyPill[data-tone='warn']{color:var(--dsw-alias-state-warning-primary,#e8590c);border-color:color-mix(in srgb,var(--dsw-alias-state-warning-primary,#e8590c) 35%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-warning-primary,#e8590c) 10%,transparent)}
      .qqNotifyError{color:var(--dsw-alias-state-error-primary);font-size:13px;line-height:20px;margin:0}
      .qqNotifySuccess{color:var(--dsw-alias-state-success-primary);font-size:13px;line-height:20px;margin:0}
      .qqNotifyInput{font:inherit;flex:none;width:200px;box-sizing:border-box;height:34px;padding:0 10px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font-size:13px;font-family:ui-monospace,SFMono-Regular,Consolas,'Liberation Mono',monospace}
      .qqNotifyInput:focus{outline:none;border-color:var(--dsw-alias-button-primary-fill)}
      .qqNotifyTipCard{background:color-mix(in srgb,var(--dsw-alias-state-info-primary,#4dabf7) 8%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-info-primary,#4dabf7) 30%,transparent)}
    `

    let stylesInstalled = false
    function installStyles() {
      if (stylesInstalled) return
      stylesInstalled = true
      const el = document.createElement('style')
      el.textContent = css
      document.head.appendChild(el)
    }

    // ---- Editable config row ----
    function ConfigRow({ title, description, value, onChange, placeholder }) {
      return React.createElement('div', { className: 'qqNotifyRow' },
        React.createElement('div', { className: 'qqNotifyRowText' },
          React.createElement('span', { className: 'qqNotifyRowTitle' }, title),
          React.createElement('p', { className: 'qqNotifyRowDesc' }, description)
        ),
        React.createElement('input', {
          className: 'qqNotifyInput',
          type: 'text',
          value: value ?? '',
          placeholder: placeholder ?? '',
          onChange: (e) => onChange(e.target.value)
        })
      )
    }

    // ---- Status label ----
    function StatusPill({ status, texts }) {
      const tone = status === 'running' ? 'ok' : status === 'stopped' ? 'warn' : 'bad'
      const label = texts[status] ?? texts.unknown
      return React.createElement('span', { className: 'qqNotifyPill', 'data-tone': tone }, label)
    }

    // ---- Main section ----
    function QqNotifySection({ t }) {
      const [status, setStatus] = React.useState()
      const [error, setError] = React.useState()
      const [success, setSuccess] = React.useState()
      const [busy, setBusy] = React.useState()
      const [config, setConfig] = React.useState({ mainQq: '', apiPort: 3002, napcatDir: '', botQq: '' })
      const [instances, setInstances] = React.useState()

      const fetchStatus = React.useCallback(async () => {
        setError(undefined)
        setSuccess(undefined)
        try {
          const res = await fetch('/dsh-qq-notify/status')
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          setStatus(data)
          setConfig(data.config ?? {})
        } catch (fail) {
          setError(fail instanceof Error ? fail.message : String(fail))
        }
      }, [])

      React.useEffect(() => { fetchStatus() }, [fetchStatus])

      const saveConfig = async () => {
        setBusy('save')
        setError(undefined)
        setSuccess(undefined)
        try {
          const res = await fetch('/dsh-qq-notify/config', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(config)
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          setSuccess(t('configSaved'))
          await fetchStatus()
        } catch (fail) {
          setError(fail instanceof Error ? fail.message : String(fail))
        } finally {
          setBusy(undefined)
        }
      }

      const napcatAction = async (action) => {
        setBusy(action)
        setError(undefined)
        setSuccess(undefined)
        try {
          const res = await fetch('/dsh-qq-notify/napcat', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ action })
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          setSuccess(data.message ?? `${action} done`)
          await fetchStatus()
        } catch (fail) {
          setError(fail instanceof Error ? fail.message : String(fail))
        } finally {
          setBusy(undefined)
        }
      }

      const testSend = async () => {
        setBusy('test')
        setError(undefined)
        setSuccess(undefined)
        try {
          const res = await fetch('/dsh-qq-notify/test', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: '{}'
          })
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          setSuccess(t('testSent'))
        } catch (fail) {
          setError(fail instanceof Error ? fail.message : String(fail))
        } finally {
          setBusy(undefined)
        }
      }

      const findNapcat = async () => {
        setInstances(undefined)
        setBusy('scan')
        setError(undefined)
        try {
          const res = await fetch('/dsh-qq-notify/find')
          if (!res.ok) throw new Error(`HTTP ${res.status}`)
          const data = await res.json()
          setInstances(data.instances ?? [])
        } catch (fail) {
          setError(fail instanceof Error ? fail.message : String(fail))
        } finally {
          setBusy(undefined)
        }
      }

      const pickInstance = async (dir) => {
        setConfig((c) => ({ ...c, napcatDir: dir }))
        setInstances(undefined)
      }

      const napcatTexts = { running: t('running'), stopped: t('stopped'), notInstalled: t('notInstalled'), unknown: t('unknown') }

      return React.createElement('section', { className: 'qqNotifySection' },
        React.createElement('h2', { className: 'qqNotifyTitle' }, t('title')),
        React.createElement('p', { className: 'qqNotifyIntro' }, t('intro')),

        // ---- Status card ----
        React.createElement('div', { className: 'qqNotifyCard' },
          React.createElement('div', { className: 'qqNotifyRow' },
            React.createElement('div', { className: 'qqNotifyRowText' },
              React.createElement('span', { className: 'qqNotifyRowTitle' }, t('napcatStatus'))
            ),
            status
              ? React.createElement(StatusPill, { status: status.napcatStatus, texts: napcatTexts })
              : React.createElement('span', { className: 'qqNotifyRowValue' }, '…')
          ),
          status && status.napcatStatus === 'running'
            ? React.createElement('div', { className: 'qqNotifyActions' },
                React.createElement('button', { type: 'button', className: 'qqNotifyButton', disabled: busy === 'restart', onClick: () => napcatAction('restart') },
                  busy === 'restart' ? t('actionBusy') : t('restartNapcat')
                ),
                React.createElement('button', { type: 'button', className: 'qqNotifyButton', disabled: busy === 'stop', onClick: () => napcatAction('stop') },
                  busy === 'stop' ? t('actionBusy') : t('stopNapcat')
                )
              )
            : React.createElement('div', { className: 'qqNotifyActions' },
                React.createElement('button', { type: 'button', className: 'qqNotifyButton qqNotifyPrimary', disabled: busy === 'start', onClick: () => napcatAction('start') },
                  busy === 'start' ? t('actionBusy') : t('startNapcat')
                )
              ),
          React.createElement('div', { className: 'qqNotifyActions' },
            React.createElement('button', { type: 'button', className: 'qqNotifyButton', disabled: busy === 'scan', onClick: findNapcat },
              busy === 'scan' ? t('scanning') : t('scanNapcat')
            )
          ),
          instances && instances.length > 0
            ? React.createElement('div', { style: { padding: '4px 0 8px', display: 'flex', flexDirection: 'column', gap: '6px' } },
                React.createElement('span', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)', lineHeight: '18px' } }, t('foundInstances')),
                instances.map((inst) =>
                  React.createElement('div', { key: inst.dir, style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 10px', borderRadius: '8px', background: 'var(--dsw-alias-bg-layer-2)', fontSize: '12px', fontFamily: 'monospace', lineHeight: '18px' } },
                    React.createElement('span', { style: { flex: '1', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }, inst.dir),
                    React.createElement('span', { style: { color: inst.valid ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-state-warning-primary)', fontSize: '11px', flex: 'none' } }, inst.valid ? '✅' : '⚠️'),
                    React.createElement('button', { type: 'button', style: { flex: 'none', fontSize: '11px', padding: '2px 8px', borderRadius: '6px', border: '1px solid var(--dsw-alias-border-l2)', background: 'transparent', color: 'var(--dsw-alias-label-primary)', cursor: 'pointer' }, onClick: () => pickInstance(inst.dir) }, t('useThis'))
                  )
                )
              )
            : instances && instances.length === 0
              ? React.createElement('p', { style: { fontSize: '12px', color: 'var(--dsw-alias-label-tertiary)', padding: '4px 0 8px', margin: 0 } }, t('noInstances'))
              : null
        ),

        // ---- Config card ----
        React.createElement('div', { className: 'qqNotifyCard' },
          React.createElement(ConfigRow, {
            title: t('mainQq'),
            description: t('mainQqDesc'),
            value: config.mainQq,
            placeholder: '940841288',
            onChange: (v) => setConfig((c) => ({ ...c, mainQq: v }))
          }),
          React.createElement(ConfigRow, {
            title: t('apiPort'),
            description: t('apiPortDesc'),
            value: String(config.apiPort ?? ''),
            placeholder: '3002',
            onChange: (v) => setConfig((c) => ({ ...c, apiPort: Number(v) || 3002 }))
          }),
          React.createElement(ConfigRow, {
            title: t('napcatDir'),
            description: t('napcatDirDesc'),
            value: config.napcatDir ?? '',
            placeholder: 'auto-detect',
            onChange: (v) => setConfig((c) => ({ ...c, napcatDir: v }))
          }),
          React.createElement(ConfigRow, {
            title: t('botQq'),
            description: t('botQqDesc'),
            value: config.botQq ?? '',
            placeholder: 'auto-detect',
            onChange: (v) => setConfig((c) => ({ ...c, botQq: v }))
          }),
          React.createElement('div', { className: 'qqNotifyActions' },
            React.createElement('button', { type: 'button', className: 'qqNotifyButton qqNotifyPrimary', disabled: busy === 'save', onClick: saveConfig },
              busy === 'save' ? t('actionBusy') : t('save')
            ),
            React.createElement('button', { type: 'button', className: 'qqNotifyButton', disabled: busy === 'test', onClick: testSend },
              busy === 'test' ? t('actionBusy') : t('testSend')
            )
          )
        ),

        // ---- Tip card ----
        React.createElement('div', { className: 'qqNotifyCard qqNotifyTipCard' },
          React.createElement('div', { style: { padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px' } },
            React.createElement('span', { style: { fontSize: '13px', fontWeight: '600', lineHeight: '20px' } }, t('tipTitle')),
            React.createElement('p', { style: { margin: '4px 0 0', fontSize: '13px', lineHeight: '20px', color: 'var(--dsw-alias-label-secondary)' } },
              t('tipLine1'), ' ', React.createElement('code', { style: { fontFamily: 'monospace', fontSize: '13px', background: 'var(--dsw-alias-bg-layer-2)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--dsw-alias-border-l2)' } }, t('tipCmd')), ' ', t('tipLine2')
            ),
            React.createElement('p', { style: { margin: '2px 0 0', fontSize: '12px', lineHeight: '18px', color: 'var(--dsw-alias-label-tertiary)' } },
              React.createElement('a', { href: t('tipMoreLink'), target: '_blank', rel: 'noopener noreferrer', style: { color: 'var(--dsw-alias-state-info-primary,#4dabf7)', textDecoration: 'underline' } }, t('tipMore'))
            )
          )
        ),

        error ? React.createElement('p', { className: 'qqNotifyError' }, error) : null,
        success ? React.createElement('p', { className: 'qqNotifySuccess' }, success) : null
      )
    }

    const inject = ['slots', 'locale']
    function apply(ctx) {
      installStyles()
      ctx.effect(
        () => ctx.locale.register(NS, { zh, en }),
        'dsh-qq-notify: copy dictionaries'
      )
      const t = ctx.locale.bind(NS)
      ctx.slots.inject('settings.section', () =>
        ctx.slots.register(
          {
            name: 'settings.section',
            id: 'qq-notify',
            order: 50,
            label: () => t('nav'),
            inject: () => ({ t })
          },
          QqNotifySection
        )
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  }
})