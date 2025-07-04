export async function onRequestPost(context) {
  try {
    const { request, env } = context
    
    // 從環境變數取得 Worker URL
    const workerUrl = env.WORKER_URL || 'https://ai-chat-api-router.neo-cloudflare.workers.dev'
    
    // 將請求轉發到 Worker
    const response = await fetch(`${workerUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': request.headers.get('CF-Connecting-IP') || '',
        'User-Agent': request.headers.get('User-Agent') || ''
      },
      body: await request.text()
    })
    
    const data = await response.text()
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
    
  } catch (error) {
    console.error('Login proxy error:', error)
    return new Response(JSON.stringify({ error: '登錄服務暫時不可用' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

// 處理 OPTIONS 請求
export async function onRequestOptions() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
} 