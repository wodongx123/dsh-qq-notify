// QQ 远控通道插件存档（qqrm-1 / pkg-5 host 代码）
// 用途：模式 B（远控通道）。OneBot v11 正向 WebSocket 服务端，接收 QQ 消息，
//       送入 DSH 子代理执行并回传结果。含 QQ 号/群白名单。
// 重新部署：在 DSH 会话中通过 cordis_define 定义本函数体（code.host = 本文件内容），
//       再 cordis_run 运行。动态插件不随 harness 重启持久化，重启后需重新定义。
// 依赖服务：webServer, timer, agents, agentDefaultModel, agentLoop（自动发现）
// 自定义项：ALLOW_USERS / ALLOW_GROUPS（白名单）、WORKSPACE、TURN_TIMEOUT_MS
return {
  inject: ['webServer', 'timer'],
  apply(ctx) {
    const webServer = ctx.webServer
    if (webServer === undefined) {
      console.error('[qq-remote] webServer unavailable, plugin inactive')
      return
    }

    // ================= 配置 =================
    const WS_PATH = '/qq/ws'
    const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11'
    // QQ 号白名单（私聊消息必须命中）；群消息需同时命中群白名单
    const ALLOW_USERS = ['10002']
    const ALLOW_GROUPS = []
    const TURN_TIMEOUT_MS = 300000
    const REPLY_CHUNK = 1800
    const WORKSPACE = 'D:\\Project\\deepseek'

    // ================= 纯 JS 基础工具 =================
    function rotl(x, n) { return ((x << n) | (x >>> (32 - n))) >>> 0 }
    function sha1Bytes(data) {
      const ml = data.length
      const bits = ml * 8
      const rem = (ml + 1) % 64
      const padZeros = rem <= 56 ? 56 - rem : 64 - rem + 56
      const total = ml + 1 + padZeros + 8
      const bytes = new Uint8Array(total)
      bytes.set(data)
      bytes[ml] = 0x80
      const dv = new DataView(bytes.buffer)
      dv.setUint32(total - 8, Math.floor(bits / 4294967296))
      dv.setUint32(total - 4, bits >>> 0)
      let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0
      const w = new Int32Array(80)
      for (let i = 0; i < total; i += 64) {
        for (let j = 0; j < 16; j++) w[j] = dv.getInt32(i + j * 4, false)
        for (let j = 16; j < 80; j++) w[j] = rotl(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1)
        let a = h0, b = h1, c = h2, d = h3, e = h4
        for (let j = 0; j < 80; j++) {
          let f, k
          if (j < 20) { f = (b & c) | ((~b) & d); k = 0x5A827999 }
          else if (j < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1 }
          else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC }
          else { f = b ^ c ^ d; k = 0xCA62C1D6 }
          const temp = (rotl(a, 5) + f + e + k + w[j]) | 0
          e = d; d = c; c = rotl(b, 30); b = a; a = temp
        }
        h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0
      }
      const out = new Uint8Array(20)
      const odv = new DataView(out.buffer)
      odv.setUint32(0, h0 >>> 0, false); odv.setUint32(4, h1 >>> 0, false)
      odv.setUint32(8, h2 >>> 0, false); odv.setUint32(12, h3 >>> 0, false); odv.setUint32(16, h4 >>> 0, false)
      return out
    }
    const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    function base64FromBytes(bytes) {
      let out = ''
      for (let i = 0; i < bytes.length; i += 3) {
        const b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2]
        out += B64[b0 >> 2]
        out += B64[((b0 & 3) << 4) | (b1 === undefined ? 0 : b1 >> 4)]
        out += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | (b2 === undefined ? 0 : b2 >> 6)]
        out += b2 === undefined ? '=' : B64[b2 & 63]
      }
      return out
    }
    function utf8(s) { return new TextEncoder().encode(s) }
    function wsAccept(key) { return base64FromBytes(sha1Bytes(utf8(key + WS_GUID))) }

    // ================= WebSocket 帧 =================
    function buildFrame(fin, opcode, payload) {
      const len = payload.length
      let header
      if (len < 126) header = new Uint8Array(2)
      else if (len < 65536) header = new Uint8Array(4)
      else header = new Uint8Array(10)
      header[0] = (fin ? 0x80 : 0) | opcode
      if (len < 126) {
        header[1] = len
      } else if (len < 65536) {
        header[1] = 126
        header[2] = (len >> 8) & 0xff
        header[3] = len & 0xff
      } else {
        header[1] = 127
        const dv = new DataView(header.buffer)
        dv.setUint32(2, Math.floor(len / 4294967296))
        dv.setUint32(6, len >>> 0)
      }
      const out = new Uint8Array(header.length + len)
      out.set(header, 0)
      out.set(payload, header.length)
      return out
    }
    function parseFrames(buf, onFrame) {
      let offset = 0
      const len = buf.length
      while (offset + 2 <= len) {
        const b0 = buf[offset]
        const b1 = buf[offset + 1]
        const fin = (b0 & 0x80) !== 0
        const opcode = b0 & 0x0f
        const masked = (b1 & 0x80) !== 0
        let payloadLen = b1 & 0x7f
        let cursor = offset + 2
        if (payloadLen === 126) {
          if (cursor + 2 > len) break
          payloadLen = (buf[cursor] << 8) | buf[cursor + 1]
          cursor += 2
        } else if (payloadLen === 127) {
          if (cursor + 8 > len) break
          let high = 0, low = 0
          for (let i = 0; i < 4; i++) high = high * 256 + buf[cursor + i]
          for (let i = 4; i < 8; i++) low = low * 256 + buf[cursor + i]
          payloadLen = high * 4294967296 + low
          if (payloadLen > 0x7fffffff) { onFrame(8, true, new Uint8Array(0)); return offset }
          cursor += 8
        }
        let maskKey = null
        if (masked) {
          if (cursor + 4 > len) break
          maskKey = buf.subarray(cursor, cursor + 4)
          cursor += 4
        }
        if (cursor + payloadLen > len) break
        let payload = buf.subarray(cursor, cursor + payloadLen)
        if (masked && maskKey) {
          const p = new Uint8Array(payloadLen)
          for (let i = 0; i < payloadLen; i++) p[i] = payload[i] ^ maskKey[i & 3]
          payload = p
        }
        onFrame(opcode, fin, payload)
        offset = cursor + payloadLen
      }
      return offset
    }

    // ================= 状态 =================
    let connCount = 0
    let agentHandle = null
    let agent = null
    let chain = Promise.resolve()
    let msgSeq = 0
    const fragState = new WeakMap()

    // ================= 通道子代理 =================
    async function ensureAgent() {
      if (agent && agentHandle) return agent
      const agents = ctx.get('agents')
      if (!agents) throw new Error('agents service unavailable')
      const agentOptions = {}
      try {
        const selSvc = ctx.get('agentDefaultModel')
        if (selSvc) {
          const current = selSvc.currentSelection()
          if (current && current.provider && current.model) {
            agentOptions.provider = current.provider
            agentOptions.model = current.model
          }
        }
      } catch (e) { console.log('[qq-remote] read default model failed:', e && e.message ? e.message : String(e)) }
      const sessionId = 'qq-remote-' + Date.now()
      agentHandle = await agents.create({
        sessionId: sessionId,
        agentOptions: agentOptions,
        meta: { cwd: WORKSPACE }
      })
      agent = agentHandle.agent
      ctx.effect(() => () => {
        try { agentHandle.dispose() } catch (e) {}
      }, 'qq-remote agent dispose')
      installModelSelection(agent)
      console.log('[qq-remote] channel agent ready:', sessionId, JSON.stringify(agentOptions))
      return agent
    }
    function installModelSelection(a) {
      const sel = ctx.get('agentDefaultModel')
      if (!sel) { console.log('[qq-remote] no agentDefaultModel service; relying on agent/request defaults')
        return }
      a.ctx.on('agent/request', async (_payload, next) => {
        const resolved = await next()
        let current
        try { current = sel.currentSelection() } catch (e) { current = undefined }
        if (!current || !current.provider || !current.model) return resolved
        return {
          ...resolved,
          provider: current.provider,
          model: current.model,
          ...(current.reasoningEffort !== undefined ? { reasoningEffort: current.reasoningEffort } : {})
        }
      })
    }
    function withTimeout(promise, ms) {
      return new Promise((resolve) => {
        let done = false
        const finish = (v) => { if (!done) { done = true; resolve(v) } }
        let disposer
        try { disposer = ctx.timeout(() => finish('__timeout__'), ms) } catch (e) { finish(undefined); return }
        promise.then((v) => { try { if (disposer) disposer() } catch (e) {}; finish(v) },
          (e) => { try { if (disposer) disposer() } catch (err) {}; finish('__error__:' + (e && e.message ? e.message : String(e))) })
      })
    }
    async function runTurn(a, text) {
      const message = {
        id: 'qq-' + (++msgSeq) + '-' + Date.now(),
        role: 'user',
        content: [{ type: 'text', text: text }],
        source: { kind: 'user' }
      }
      a.followup(message)
      const result = await withTimeout(a.whenIdle(), TURN_TIMEOUT_MS)
      if (result === '__timeout__') {
        try { a.cancel({ kind: 'user' }) } catch (e) {}
        return '（本轮执行超过 ' + Math.round(TURN_TIMEOUT_MS / 60000) + ' 分钟，已中止）'
      }
      if (typeof result === 'string' && result.startsWith('__error__')) {
        return '（执行出错: ' + result.slice(10) + '）'
      }
      return extractReply(a)
    }
    function extractReply(a) {
      const events = a.session.events
      let lastMsg = null
      for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i]
        if (ev && ev.type === 'assistant/message') {
          lastMsg = ev
          break
        }
      }
      if (lastMsg) {
        const blocks = lastMsg.data && lastMsg.data.message && lastMsg.data.message.content
        if (Array.isArray(blocks)) {
          const parts = []
          for (const b of blocks) {
            if (b && b.type === 'text' && typeof b.text === 'string') parts.push(b.text)
          }
          if (parts.length) return parts.join('\n')
        }
      }
      const diag = []
      for (let i = events.length - 1; i >= 0; i--) {
        const ev = events[i]
        if (!ev) continue
        if (ev.type === 'turn/end') {
          const r = ev.data && ev.data.reason
          if (r) diag.push('turn/end reason=' + r.kind + (r.error && r.error.message ? ' :: ' + r.error.message : '') + (r.reason && r.reason.message ? ' :: ' + r.reason.message : ''))
          break
        }
      }
      const counts = {}
      for (const ev of events) { const t = ev && ev.type; if (t) counts[t] = (counts[t] || 0) + 1 }
      const header = events.filter(function (ev) { return ev && ev.type === 'request/header' })
      const hdrInfo = header.length ? ' requestHeader=' + (header[header.length - 1].data && header[header.length - 1].data.header && header[header.length - 1].data.header.config ? JSON.stringify({ p: header[header.length - 1].data.header.config.provider, m: header[header.length - 1].data.header.config.model }) : '?') : ' no-request-header'
      return '（未生成文本回复）诊断: ' + (diag.join('; ') || 'no-turn-end') + hdrInfo + ' 事件分布=' + JSON.stringify(counts)
    }

    // ================= OneBot v11 处理 =================
    function isAllowed(userId, groupId) {
      if (!ALLOW_USERS.includes(userId)) return false
      if (groupId && !ALLOW_GROUPS.includes(groupId)) return false
      return true
    }
    function extractText(message) {
      if (typeof message === 'string') return message.trim()
      if (Array.isArray(message)) {
        return message.map((seg) => (seg && seg.type === 'text' && seg.data) ? String(seg.data.text || '') : '').join('').trim()
      }
      return ''
    }
    function sendApiCall(socket, action, params) {
      const frame = JSON.stringify({ action: action, params: params })
      try { socket.write(buildFrame(true, 0x1, utf8(frame))) } catch (e) { console.error('[qq-remote] send failed', e) }
    }
    function sendText(socket, userId, groupId, text) {
      const chunks = splitText(text, REPLY_CHUNK)
      for (const c of chunks) {
        if (groupId) sendApiCall(socket, 'send_group_msg', { group_id: Number(groupId), message: c })
        else sendApiCall(socket, 'send_private_msg', { user_id: Number(userId), message: c })
      }
    }
    function splitText(text, max) {
      const chars = Array.from(text)
      const out = []
      for (let i = 0; i < chars.length; i += max) out.push(chars.slice(i, i + max).join(''))
      return out
    }
    function statusText() {
      return '【QQ远控通道】\nWS端点: ws://127.0.0.1:' + (webServer.port || '?') + WS_PATH +
        '\n连接数: ' + Math.max(0, connCount) +
        '\n通道代理: ' + (agent ? agent.id : '未创建') +
        '\n白名单用户: ' + (ALLOW_USERS.length ? ALLOW_USERS.join(', ') : '(空)') +
        '\n白名单群: ' + (ALLOW_GROUPS.length ? ALLOW_GROUPS.join(', ') : '(空)')
    }
    function handleOneBotEvent(socket, obj) {
      if (!obj || typeof obj !== 'object') return
      if (obj.post_type === 'meta_event') {
        console.log('[qq-remote] meta event:', obj.meta_event_type)
        return
      }
      if (obj.post_type !== 'message') return
      const userId = String(obj.user_id)
      const groupId = obj.group_id !== undefined && obj.group_id !== null ? String(obj.group_id) : null
      const text = extractText(obj.message !== undefined ? obj.message : obj.raw_message)
      if (!text) return
      if (!isAllowed(userId, groupId)) {
        console.log('[qq-remote] blocked from', userId, groupId ? 'in group ' + groupId : '')
        if (!groupId) sendText(socket, userId, null, '[远控通道] 你的QQ号未授权，无法使用本通道。')
        return
      }
      console.log('[qq-remote] message from', userId, groupId ? 'in group ' + groupId : '', ':', text.slice(0, 120))
      enqueue(socket, { userId: userId, groupId: groupId, text: text })
    }
    function enqueue(socket, task) {
      chain = chain.then(async () => {
        try {
          const t = task.text.trim()
          if (t === '/状态' || t === '/status') { sendText(socket, task.userId, task.groupId, statusText()); return }
          if (t === '/帮助' || t === '/help') {
            sendText(socket, task.userId, task.groupId, '【QQ远控通道】直接发送指令即可让本机 AI 执行。可用命令：/状态 /帮助')
            return
          }
          const a = await ensureAgent()
          const reply = await runTurn(a, task.text)
          sendText(socket, task.userId, task.groupId, reply)
        } catch (e) {
          console.error('[qq-remote] task error', e)
          sendText(socket, task.userId, task.groupId, '[远控通道] 处理出错: ' + (e && e.message ? e.message : String(e)))
        }
      })
    }

    // ================= WS 连接处理 =================
    function onFrame(socket, opcode, fin, payload) {
      if (opcode === 0x9) { try { socket.write(buildFrame(true, 0xA, payload)) } catch (e) {}; return }
      if (opcode === 0x8) {
        try { socket.write(buildFrame(true, 0x8, payload)) } catch (e) {}
        try { socket.end() } catch (e) {}
        return
      }
      if (opcode === 0x0 || ((opcode === 0x1 || opcode === 0x2) && !fin)) {
        const st = fragState.get(socket) || { opcode: 0, parts: [] }
        if (opcode !== 0x0) st.opcode = opcode
        st.parts.push(payload)
        fragState.set(socket, st)
        if (!fin) return
        let total = 0
        for (const p of st.parts) total += p.length
        const joined = new Uint8Array(total)
        let at = 0
        for (const p of st.parts) { joined.set(p, at); at += p.length }
        fragState.delete(socket)
        onFrame(socket, st.opcode, true, joined)
        return
      }
      if (opcode === 0x1) {
        let text
        try { text = new TextDecoder().decode(payload) } catch (e) { return }
        let obj = null
        try { obj = JSON.parse(text) } catch (e) { console.log('[qq-remote] non-JSON frame:', text.slice(0, 200)); return }
        handleOneBotEvent(socket, obj)
      }
    }
    ctx.effect(() => webServer.registerUpgrade({
      path: WS_PATH,
      handler: (req, socket, head) => {
        const key = req.headers['sec-websocket-key']
        const upgrade = String(req.headers.upgrade || '').toLowerCase()
        if (!key || upgrade !== 'websocket') { try { socket.destroy() } catch (e) {}; return }
        try {
          socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + wsAccept(key) + '\r\n\r\n')
        } catch (e) { try { socket.destroy() } catch (err) {}; return }
        connCount++
        console.log('[qq-remote] websocket connected, port', webServer.port)
        let pending = new Uint8Array(0)
        const onData = (chunk) => {
          try {
            const buf = new Uint8Array(pending.length + chunk.length)
            buf.set(pending, 0)
            buf.set(chunk, pending.length)
            const consumed = parseFrames(buf, (opcode, fin, payload) => onFrame(socket, opcode, fin, payload))
            pending = consumed < buf.length ? buf.subarray(consumed) : new Uint8Array(0)
          } catch (e) {
            console.error('[qq-remote] frame error', e)
            try { socket.destroy() } catch (err) {}
          }
        }
        socket.on('data', onData)
        if (head && head.length > 0) onData(head)
        try { socket.resume() } catch (e) {}
        socket.once('close', () => { connCount = Math.max(0, connCount - 1); console.log('[qq-remote] websocket closed') })
      }
    }), 'qq-remote upgrade route')

    // ================= 状态查询 RPC =================
    ctx.effect(() => harness.handle('qq-remote/status', () => {
      return {
        path: WS_PATH,
        port: webServer.port || null,
        connections: Math.max(0, connCount),
        agentId: agent ? agent.id : null,
        allowUsers: ALLOW_USERS.slice(),
        allowGroups: ALLOW_GROUPS.slice()
      }
    }), 'qq-remote status rpc')

    console.log('[qq-remote] active on', WS_PATH, 'port', webServer.port, '| allow users:', ALLOW_USERS.join(',') || '(none)')
  }
}
