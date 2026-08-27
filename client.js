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
      intro: 'Send notifications to your QQ via the local NapCat bot. First download and install NapCat, then configure the directory below.',
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
      actionBusy: 'Working…',
      startingWait: 'Starting… (refreshing in 6s)',
      configSaved: 'Configuration saved.',
      save: 'Save',
      webui: 'Open WebUI',
      webuiDesc: 'Manage NapCat settings and scan QR code:',
      scanNapcat: 'Scan for NapCat',
      scanning: 'Scanning…',
      foundInstances: 'Found instances',
      useThis: 'Use this',
      noInstances: 'No NapCat instances found.',
      setInstance: 'Select an instance to set as NapCat directory',
      // Guide card
      guideTitle: '📥 NapCat Installation Guide',
      guideLink: 'https://napneko.github.io/guide/boot/Shell',
      guideDesc: 'Follow the official NapCat Shell boot guide:',
      guideStep1: '1. Download NapCat Shell from GitHub Releases',
      guideStep2: '2. Download and install QQNT from im.qq.com',
      guideStep3: '3. Extract NapCat to any directory',
      guideStep4: '4. Fill in the NapCat directory path in the config card above',
      guideStep5: '5. Click "Start NapCat" and scan the QR code with your phone QQ',
    }

    const zh = {
      nav: 'QQ 通知',
      title: 'QQ 通知',
      intro: '通过本机 NapCat 机器人向你的 QQ 发送通知。请先下载安装 NapCat，然后在下方配置目录。',
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
      actionBusy: '处理中…',
      startingWait: '正在启动…（6秒后刷新）',
      configSaved: '配置已保存。',
      save: '保存',
      webui: '打开 WebUI',
      webuiDesc: '管理 NapCat 设置和扫码登录：',
      scanNapcat: '扫描 NapCat',
      scanning: '扫描中…',
      foundInstances: '找到的实例',
      useThis: '使用此目录',
      noInstances: '未找到任何 NapCat 实例。',
      setInstance: '选择一个实例设为 NapCat 目录',
      // Guide card
      guideTitle: '📥 NapCat 安装指引',
      guideLink: 'https://napneko.github.io/guide/boot/Shell',
      guideDesc: '参考 NapCat 官方 Shell 引导文档：',
      guideStep1: '1. 从 GitHub Releases 下载 NapCat Shell 版',
      guideStep2: '2. 从 im.qq.com 下载并安装 QQNT',
      guideStep3: '3. 解压 NapCat 到任意目录',
      guideStep4: '4. 在上方配置卡片中填入 NapCat 目录路径',
      guideStep5: '5. 点击「启动 NapCat」并用手机 QQ 扫码登录',
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
      const [showGuide, setShowGuide] = React.useState(false)

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
          if (action === 'start' || action === 'restart') {
            // 启动后轮询状态，最多等 20 秒让 NapCat 跑起来
            setBusy('start-wait')
            for (let i = 0; i < 20; i++) {
              await new Promise((r) => setTimeout(r, 1000))
              const res = await fetch('/dsh-qq-notify/status')
              if (res.ok) {
                const d = await res.json()
                setStatus(d)
                setConfig(d.config ?? {})
                if (d.napcatStatus === 'running') break
              }
            }
          } else {
            await fetchStatus()
          }
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

        // ---- Guide card (collapsible) ----
        React.createElement('div', { className: 'qqNotifyCard qqNotifyTipCard' },
          React.createElement('div', { style: { padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '4px' } },
            React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }, onClick: () => setShowGuide(!showGuide) },
              React.createElement('span', { style: { fontSize: '13px', lineHeight: '24px', color: 'var(--dsw-alias-label-tertiary)', transition: 'transform 0.2s', transform: showGuide ? 'rotate(90deg)' : 'rotate(0deg)' } }, '▶'),
              React.createElement('span', { style: { fontSize: '15px', fontWeight: '600', lineHeight: '24px' } }, t('guideTitle'))
            ),
            showGuide ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' } },
              React.createElement('p', { style: { margin: '4px 0 0', fontSize: '13px', lineHeight: '20px', color: 'var(--dsw-alias-label-secondary)' } }, t('guideDesc')),
              React.createElement('a', { href: t('guideLink'), target: '_blank', rel: 'noopener noreferrer', style: { fontSize: '13px', lineHeight: '20px', color: 'var(--dsw-alias-state-info-primary,#4dabf7)', textDecoration: 'underline', display: 'block', marginBottom: '4px' } }, t('guideLink')),
              React.createElement('p', { style: { margin: '2px 0', fontSize: '13px', lineHeight: '20px', color: 'var(--dsw-alias-label-secondary)' } }, t('guideStep1')),
              React.createElement('p', { style: { margin: '2px 0', fontSize: '13px', lineHeight: '20px', color: 'var(--dsw-alias-label-secondary)' } }, t('guideStep2')),
              React.createElement('p', { style: { margin: '2px 0', fontSize: '13px', lineHeight: '20px', color: 'var(--dsw-alias-label-secondary)' } }, t('guideStep3')),
              React.createElement('p', { style: { margin: '2px 0', fontSize: '13px', lineHeight: '20px', color: 'var(--dsw-alias-label-secondary)' } }, t('guideStep4')),
              React.createElement('p', { style: { margin: '2px 0 0', fontSize: '13px', lineHeight: '20px', color: 'var(--dsw-alias-label-secondary)' } }, t('guideStep5')),
            ) : null
          )
        ),

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
                React.createElement('a', { href: 'http://127.0.0.1:6099/webui', target: '_blank', rel: 'noopener noreferrer', className: 'qqNotifyButton qqNotifyPrimary', style: { textDecoration: 'none' } }, t('webui')),
                React.createElement('button', { type: 'button', className: 'qqNotifyButton', disabled: busy === 'stop', onClick: () => napcatAction('stop') },
                  busy === 'stop' ? t('actionBusy') : t('stopNapcat')
                )
              )
            : React.createElement('div', { className: 'qqNotifyActions' },
                React.createElement('button', { type: 'button', className: 'qqNotifyButton qqNotifyPrimary', disabled: busy === 'start' || busy === 'start-wait', onClick: () => napcatAction('start') },
                  busy === 'start-wait' ? t('startingWait') : (busy === 'start' ? t('actionBusy') : t('startNapcat'))
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
            placeholder: '',
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