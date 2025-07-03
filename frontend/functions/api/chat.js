export async function onRequest(context) {
  const { request } = context

  // 只允許 POST
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  // 讀取 body 並直接轉發
  const workerApiUrl = 'https://ai-chat-api-router.neo-cloudflare.workers.dev/chat'

  const headers = new Headers(request.headers)
  headers.set('Host', 'ai-chat-api-router.neo-cloudflare.workers.dev')

  const proxyRes = await fetch(workerApiUrl, {
    method: 'POST',
    headers,
    body: request.body,
    redirect: 'follow',
  })

  // 回傳 Worker 的 response
  return new Response(proxyRes.body, {
    status: proxyRes.status,
    statusText: proxyRes.statusText,
    headers: proxyRes.headers
  })
} 