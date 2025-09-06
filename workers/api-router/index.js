import { Router } from 'itty-router'

const router = Router()

// AI Gateway 和各種 AI 模型的整合
class AIGatewayClient {
  constructor(env) {
    this.env = env
    this.gatewayUrl = env.AI_GATEWAY_URL
  }

  async callWorkerAI(message) {
    try {
      // 透過 Cloudflare AI Gateway 調用 Workers AI（正確路徑與 header）
      const response = await fetch(`${this.gatewayUrl}/workers-ai/@cf/meta/llama-3.1-8b-instruct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-aig-authorization': `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`,
          'Authorization': `Bearer ${this.env.WORKER_AI_TOKEN}`
        },
        body: JSON.stringify({
          prompt: message
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Worker AI Gateway 錯誤: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      // 根據 API 回傳格式調整
      return data.result?.response || data.result || data.choices?.[0]?.message?.content || ''
    } catch (error) {
      console.error('Worker AI 調用失敗:', error)
      throw error
    }
  }

  async callOpenAI(message) {
    try {
      // 檢查必要的 API 密鑰
      if (!this.env.CLOUDFLARE_API_TOKEN) {
        throw new Error('Cloudflare API Token 未設定。請在 .dev.vars 檔案中設定 CLOUDFLARE_API_TOKEN')
      }

      // 透過 AI Gateway 調用 OpenAI API (使用 BYOK)
      const response = await fetch(`${this.gatewayUrl}/openai/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'cf-aig-authorization': `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: message }],
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`OpenAI API 錯誤: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error) {
      console.error('OpenAI 調用失敗:', error)
      throw error
    }
  }

  async callPerplexity(message) {
    try {
      // 透過 Cloudflare AI Gateway 調用 Perplexity API (使用 BYOK)
      const response = await fetch(`${this.gatewayUrl}/perplexity-ai/chat/completions`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'cf-aig-authorization': `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: message }]
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        throw new Error(`Perplexity Gateway 錯誤: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error) {
      console.error('Perplexity 調用失敗:', error)
      throw error
    }
  }

  async processMessage(message, model) {
    switch (model) {
      case 'worker-ai':
        return await this.callWorkerAI(message)
      case 'gpt':
        return await this.callOpenAI(message)
      case 'perplexity':
        return await this.callPerplexity(message)
      default:
        throw new Error(`不支援的模型: ${model}`)
    }
  }
}

// CORS 中介軟體
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// 處理 OPTIONS 請求
router.options('*', () => new Response(null, { headers: corsHeaders }))

// 健康檢查
router.get('/api/health', () => {
  return new Response(JSON.stringify({ status: 'healthy' }), {
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
})

// 用戶登錄端點
router.post('/api/auth/login', async (request, env) => {
  try {
    const { username, password, turnstileToken } = await request.json()
    
    if (!username || !password) {
      return new Response(JSON.stringify({ error: '缺少必要參數' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 根據環境檢查 Turnstile 驗證
    const isProduction = env.ENVIRONMENT === 'production'
    
    if (isProduction && turnstileToken) {
      const turnstileResponse = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: turnstileToken
        })
      })

      const turnstileResult = await turnstileResponse.json()
      if (!turnstileResult.success) {
        return new Response(JSON.stringify({ error: 'Turnstile 驗證失敗' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      }
    } else if (isProduction && !turnstileToken) {
      return new Response(JSON.stringify({ error: '生產環境需要 Turnstile 驗證' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 簡單的密碼 hash（實際應用中應使用 bcrypt）
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // 從 D1 查詢用戶
    const user = await env.DB.prepare(
      'SELECT id, username, password_hash, email, is_active FROM users WHERE username = ? AND is_active = 1'
    ).bind(username).first()

    if (!user || user.password_hash !== passwordHash) {
      // 記錄登錄失敗
      await env.DB.prepare(
        'INSERT INTO login_logs (user_id, ip_address, user_agent, success) VALUES (?, ?, ?, ?)'
      ).bind(user?.id || null, request.headers.get('CF-Connecting-IP') || 'unknown', 
             request.headers.get('User-Agent') || 'unknown', false).run()

      return new Response(JSON.stringify({ error: '用戶名或密碼錯誤' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 記錄登錄成功
    await env.DB.prepare(
      'INSERT INTO login_logs (user_id, ip_address, user_agent, success) VALUES (?, ?, ?, ?)'
    ).bind(user.id, request.headers.get('CF-Connecting-IP') || 'unknown', 
           request.headers.get('User-Agent') || 'unknown', true).run()

    // 生成簡單的 JWT token（實際應用中應使用更安全的方法）
    const token = btoa(JSON.stringify({
      userId: user.id,
      username: user.username,
      email: user.email,
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24小時過期
    }))

    return new Response(JSON.stringify({ 
      success: true, 
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (error) {
    console.error('登錄錯誤:', error)
    return new Response(JSON.stringify({ error: '登錄失敗', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})

// 驗證 token 端點
router.post('/api/auth/verify', async (request, env) => {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return new Response(JSON.stringify({ error: '缺少 token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const decoded = JSON.parse(atob(token))
    if (decoded.exp < Date.now()) {
      return new Response(JSON.stringify({ error: 'Token 已過期' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      user: {
        id: decoded.userId,
        username: decoded.username,
        email: decoded.email
      }
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (error) {
    console.error('Token 驗證錯誤:', error)
    return new Response(JSON.stringify({ error: 'Token 無效' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})

// 聊天 API 端點
router.post('/api/chat', async (request, env) => {
  try {
    const { message, model } = await request.json()
    
    if (!message || !model) {
      return new Response(JSON.stringify({ error: '缺少必要參數' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 生成聊天 ID
    const chatId = crypto.randomUUID()
    const timestamp = new Date().toISOString()

    // 檢查 KV 快取
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    const cacheKey = `chat:${model}:${hashHex.slice(0, 32)}`
    const cached = await env.CACHE.get(cacheKey)
    
    if (cached) {
      console.log('從快取返回結果')
      return new Response(cached, {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    // 直接調用 AI 模型
    const aiClient = new AIGatewayClient(env)
    const aiResponse = await aiClient.processMessage(message, model)

    // 建立完整的聊天記錄
    const chatData = {
      id: chatId,
      userId: 'anonymous',
      model,
      timestamp,
      messages: [
        {
          role: 'user',
          content: message,
          timestamp
        },
        {
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString()
        }
      ]
    }

    // 儲存到 R2
    try {
      const r2Key = `chat-${chatId}.json`
      await env.STORAGE.put(r2Key, JSON.stringify(chatData, null, 2), {
        httpMetadata: {
          contentType: 'application/json',
        }
      })

      // 儲存元數據到 D1
      await env.DB.prepare(
        'INSERT INTO chats (id, user_id, created_at, r2_key, model) VALUES (?, ?, ?, ?, ?)'
      ).bind(chatId, 'anonymous', timestamp, r2Key, model).run()
    } catch (storageError) {
      console.error('儲存失敗:', storageError)
      // 即使儲存失敗，仍然返回 AI 回應
    }

    // 快取結果（1小時TTL）
    const result = { result: aiResponse }
    try {
      await env.CACHE.put(cacheKey, JSON.stringify(result), {
        expirationTtl: 3600
      })
    } catch (cacheError) {
      console.error('快取失敗:', cacheError)
    }

    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (error) {
    console.error('API Router 錯誤:', error)
    return new Response(JSON.stringify({ error: '內部伺服器錯誤', details: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})

// 獲取聊天歷史
router.get('/api/chats/:chatId', async (request, env) => {
  try {
    const { chatId } = request.params
    
    // 從 R2 獲取聊天記錄
    const object = await env.STORAGE.get(`chat-${chatId}.json`)
    
    if (!object) {
      return new Response(JSON.stringify({ error: '聊天記錄不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const chatData = await object.json()
    
    return new Response(JSON.stringify(chatData), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (error) {
    console.error('獲取聊天歷史錯誤:', error)
    return new Response(JSON.stringify({ error: '無法獲取聊天記錄' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})

// 列出所有聊天
router.get('/api/chats', async (request, env) => {
  try {
    const { results } = await env.DB.prepare(
      'SELECT id, user_id, created_at, r2_key FROM chats ORDER BY created_at DESC LIMIT 50'
    ).all()

    return new Response(JSON.stringify({ chats: results }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })

  } catch (error) {
    console.error('列出聊天錯誤:', error)
    return new Response(JSON.stringify({ error: '無法獲取聊天列表' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    })
  }
})

// 處理所有未匹配的請求
router.all('*', () => {
  return new Response(JSON.stringify({ error: '找不到請求的資源' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
})

export default {
  async fetch(request, env, ctx) {
    return router.handle(request, env, ctx)
  }
} 