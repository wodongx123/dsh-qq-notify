// QQ 远控通道模拟客户端 —— 用于在没有真实 QQ/LLOneBot 时验证桥接链路
// 用法: node mock-client.mjs [ws://127.0.0.1:17460/qq/ws] [要发送的消息]
// 它会模拟 OneBot v11 私聊消息事件，并打印服务端返回的 API 调用帧。
const WS_URL = process.argv[2] || 'ws://127.0.0.1:17460/qq/ws'
const MSG_TEXT = process.argv[3] || '用一句话回答：1+1等于几？'
const USER_ID = Number(process.argv[4] || 10002)

const ws = new WebSocket(WS_URL)

function sendMessage(text) {
  const evt = {
    post_type: 'message',
    message_type: 'private',
    time: Math.floor(Date.now() / 1000),
    self_id: 10001,
    sub_type: 'friend',
    message_id: Math.floor(Math.random() * 1e9),
    user_id: USER_ID,
    message: [{ type: 'text', data: { text } }],
    raw_message: text,
    sender: { user_id: USER_ID, nickname: 'tester' }
  }
  ws.send(JSON.stringify(evt))
}

let replies = 0
let heartbeat = 0

ws.onopen = () => {
  console.log('[mock] connected to', WS_URL)
  sendMessage(MSG_TEXT)
}
ws.onmessage = (e) => {
  const obj = JSON.parse(String(e.data))
  if (obj.action) {
    console.log('[mock] API CALL:', JSON.stringify(obj))
    if (obj.action === 'send_private_msg' || obj.action === 'send_group_msg') {
      replies++
      console.log('[mock] === 收到回复 ===')
      console.log('[mock]', JSON.stringify(obj.params && obj.params.message))
      if (replies === 1) {
        console.log('[mock] 发送第二条消息测试连续对话...')
        sendMessage('很好，那我再问：2*3+4等于几？')
      } else {
        ws.close()
      }
    }
  } else if (obj.post_type === 'meta_event') {
    console.log('[mock] meta:', obj.meta_event_type)
  } else {
    console.log('[mock] event:', JSON.stringify(obj))
  }
}
ws.onerror = (e) => {
  console.error('[mock] ws error:', e && (e.message || e.error || 'unknown'))
  process.exit(1)
}
ws.onclose = (e) => {
  console.log('[mock] closed code=', e && e.code)
  process.exit(replies >= 1 ? 0 : 3)
}
setTimeout(() => {
  console.error('[mock] TIMEOUT: 未收到回复')
  process.exit(2)
}, 240000)
