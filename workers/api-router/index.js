import { Router } from 'itty-router'

const router = Router()

// AI Gateway 和各種 AI 模型的整合
class AIGatewayClient {
  constructor(env) {
    this.env = env
    this.gatewayUrl = env.AI_GATEWAY_URL
  }

  // 根據模型 ID 獲取 Workers AI 模型路徑
  getWorkerAIModelPath(modelId) {
    const modelMappings = {
      'workers-ai-gpt-oss-120b': '@cf/openai/gpt-oss-120b',
      'workers-ai-gpt-oss-20b': '@cf/openai/gpt-oss-20b', 
      // 暫時移除 DeepSeek 模型，直到確認正確路徑
      // 'workers-ai-deepseek-r1': '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
      'workers-ai-llama': '@cf/meta/llama-3.1-8b-instruct'
    }
    
    return modelMappings[modelId] || '@cf/meta/llama-3.1-8b-instruct'
  }

  // 將前端模型值轉換為用戶友好的模型名稱（用於 metadata）
  getModelDisplayName(model) {
    const displayNames = {
      'workers-ai-gpt-oss-120b': 'gpt-oss-120b',
      'workers-ai-gpt-oss-20b': 'gpt-oss-20b',
      'workers-ai-deepseek-r1': 'deepseek-r1-distill-qwen-32b',
      'workers-ai-llama': 'llama-3.1-8b',
      'openai-gpt-3.5': 'gpt-3.5-turbo',
      'openai-gpt-5': 'gpt-5',
      'perplexity-sonar': 'sonar-small-online',
      // 向後相容舊的模型名稱
      'worker-ai': 'llama-3.1-8b',
      'gpt': 'gpt-3.5-turbo',
      'perplexity': 'sonar-small-online'
    }
    
    return displayNames[model] || model
  }

  // 獲取 OpenAI 模型名稱
  getOpenAIModelName(model) {
    const modelMappings = {
      'openai-gpt-3.5': 'gpt-3.5-turbo',
      'openai-gpt-5': 'gpt-5',
      // 向後相容
      'gpt': 'gpt-3.5-turbo'
    }
    return modelMappings[model] || 'gpt-3.5-turbo'
  }

  async callWorkerAI(message, modelId, metadata = {}) {
    try {
      // 準備 headers
      const headers = {
        'Content-Type': 'application/json',
        'cf-aig-authorization': `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`,
        'Authorization': `Bearer ${this.env.WORKER_AI_TOKEN}`
      }

      // 加入 custom metadata (最多 5 個)
      if (Object.keys(metadata).length > 0) {
        headers['cf-aig-metadata'] = JSON.stringify(metadata)
        console.log('🔗 WorkerAI - Adding cf-aig-metadata header:', JSON.stringify(metadata))
      }

      // 根據模型 ID 選擇正確的模型路徑
      const modelPath = this.getWorkerAIModelPath(modelId)
      console.log(`🤖 Using Workers AI model: ${modelPath}`)

      // 根據模型類型決定請求格式
      let requestBody
      if (modelPath.includes('gpt-oss') || modelPath.includes('deepseek')) {
        // 對於 text-generation 模型使用 input 格式
        requestBody = { input: message }
        console.log('📝 Using text-generation format (input) for:', modelPath)
      } else {
        // 對於 chat 模型使用 messages 格式
        requestBody = { messages: [{ role: 'user', content: message }] }
        console.log('💬 Using chat format (messages) for:', modelPath)
      }

      // 透過 Cloudflare AI Gateway 調用 Workers AI
      const response = await fetch(`${this.gatewayUrl}/workers-ai/${modelPath}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.text()
        
        // 特別處理 429 限流錯誤
        if (response.status === 429) {
          throw new Error('Error Code 429，使用流量已超過，AI Gateway 限流規則觸發')
        }
        
        throw new Error(`Worker AI Gateway 錯誤: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      console.log('🔍 WorkerAI Response structure:', JSON.stringify(data, null, 2))
      
      // 根據模型類型和 API 回傳格式調整
      if (modelPath.includes('gpt-oss') || modelPath.includes('deepseek')) {
        // 新的 gpt-oss 和 deepseek 模型回應格式
        // 結構: data.result.output[1].content[0].text (message 部分)
        const output = data.result?.output
        if (output && Array.isArray(output) && output.length > 1) {
          // 尋找 type: "message" 的輸出
          const messageOutput = output.find(item => item.type === 'message')
          if (messageOutput && messageOutput.content && messageOutput.content[0]) {
            const extractedText = messageOutput.content[0].text || ''
            console.log('✅ Successfully extracted text from Workers AI response:', extractedText.substring(0, 100) + '...')
            return extractedText
          } else {
            console.error('❌ Could not find message content in Workers AI response')
          }
        } else {
          console.error('❌ Invalid or missing output array in Workers AI response')
        }
        // 後備解析邏輯
        return data.result?.response || data.result || data.output || ''
      } else {
        // chat 模型的回應格式
        return data.result?.response || data.result || data.choices?.[0]?.message?.content || ''
      }
    } catch (error) {
      console.error('Worker AI 調用失敗:', error)
      throw error
    }
  }

  async callOpenAI(message, model = 'gpt-3.5-turbo', metadata = {}, stream = true, images = null) {
    try {
      // 檢查必要的 API 密鑰
      if (!this.env.CLOUDFLARE_API_TOKEN) {
        throw new Error('Cloudflare API Token 未設定。請在 .dev.vars 檔案中設定 CLOUDFLARE_API_TOKEN')
      }

      // 準備 headers
      const headers = {
        'Content-Type': 'application/json',
        'cf-aig-authorization': `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`
      }

      // 加入 custom metadata (最多 5 個)
      if (Object.keys(metadata).length > 0) {
        headers['cf-aig-metadata'] = JSON.stringify(metadata)
        console.log('🔗 OpenAI - Adding cf-aig-metadata header:', JSON.stringify(metadata))
      }

      // 構建消息內容
      let messageContent = []
      
      // 如果有文本，添加文本內容
      if (message && message.trim() !== '') {
        messageContent.push({
          type: 'text',
          text: message
        })
      }
      
      // 如果有圖片，添加圖片內容
      if (images && Array.isArray(images) && images.length > 0) {
        for (const img of images) {
          // 構建 base64 URL 格式：data:image/{mimeType};base64,{base64}
          const imageUrl = `data:${img.mimeType};base64,${img.base64}`
          messageContent.push({
            type: 'image_url',
            image_url: {
              url: imageUrl
            }
          })
        }
      }
      
      // 如果沒有任何內容，使用默認文本
      if (messageContent.length === 0) {
        messageContent.push({
          type: 'text',
          text: '請分析這些圖片'
        })
      }

      // 根據模型類型選擇正確的參數
      // gpt-5 和其他新模型使用 max_completion_tokens，舊模型使用 max_tokens
      const requestBody = {
        model: model,
        messages: [{ role: 'user', content: messageContent }],
        stream: stream
      }

      // 對於 gpt-5 和新模型使用 max_completion_tokens
      if (model === 'gpt-5' || model.startsWith('gpt-5')) {
        requestBody.max_completion_tokens = 1000
      } else {
        // 對於舊模型使用 max_tokens（向後兼容）
        requestBody.max_tokens = 1000
      }

      // 透過 AI Gateway 調用 OpenAI API (使用 BYOK)
      const response = await fetch(`${this.gatewayUrl}/openai/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.text()
        
        // 特別處理 429 限流錯誤
        if (response.status === 429) {
          throw new Error('Error Code 429，使用流量已超過，AI Gateway 限流規則觸發')
        }
        
        throw new Error(`OpenAI API 錯誤: ${response.status} - ${errorData}`)
      }

      // 如果是 streaming mode，返回 response 对象供上层处理
      if (stream) {
        return response
      }

      // 非 streaming mode 的原有逻辑
      const data = await response.json()
      return data.choices[0].message.content
    } catch (error) {
      console.error('OpenAI 調用失敗:', error)
      throw error
    }
  }

  async callPerplexity(message, metadata = {}) {
    try {
      // 準備 headers
      const headers = {
        'accept': 'application/json',
        'content-type': 'application/json',
        'cf-aig-authorization': `Bearer ${this.env.CLOUDFLARE_API_TOKEN}`
      }

      // 加入 custom metadata (最多 5 個)
      if (Object.keys(metadata).length > 0) {
        headers['cf-aig-metadata'] = JSON.stringify(metadata)
        console.log('🔗 Perplexity - Adding cf-aig-metadata header:', JSON.stringify(metadata))
      }

      // 透過 Cloudflare AI Gateway 調用 Perplexity API (使用 BYOK)
      const response = await fetch(`${this.gatewayUrl}/perplexity-ai/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: message }]
        })
      })

      if (!response.ok) {
        const errorData = await response.text()
        
        // 特別處理 429 限流錯誤
        if (response.status === 429) {
          throw new Error('Error Code 429，使用流量已超過，AI Gateway 限流規則觸發')
        }
        
        throw new Error(`Perplexity Gateway 錯誤: ${response.status} - ${errorData}`)
      }

      const data = await response.json()
      return data.choices[0].message.content
    } catch (error) {
      console.error('Perplexity 調用失敗:', error)
      throw error
    }
  }

  async processMessage(message, model, metadata = {}, stream = false) {
    // 處理 Workers AI 模型
    if (model.startsWith('workers-ai-')) {
      return await this.callWorkerAI(message, model, metadata)
    }
    
    // 處理其他模型
    switch (model) {
      case 'openai-gpt-3.5':
      case 'openai-gpt-5':
        const openaiModel = this.getOpenAIModelName(model)
        return await this.callOpenAI(message, openaiModel, metadata, stream)
      case 'perplexity-sonar':
        return await this.callPerplexity(message, metadata)
      // 向後相容舊的模型名稱
      case 'worker-ai':
        return await this.callWorkerAI(message, 'workers-ai-llama', metadata)
      case 'gpt':
        return await this.callOpenAI(message, 'gpt-3.5-turbo', metadata, stream)
      case 'perplexity':
        return await this.callPerplexity(message, metadata)
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

    // 從 D1 查詢用戶（包含 user_tier）
    const user = await env.DB.prepare(
      'SELECT id, username, password_hash, email, user_tier, is_active FROM users WHERE username = ? AND is_active = 1'
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
      userTier: user.user_tier,
      exp: Date.now() + 24 * 60 * 60 * 1000 // 24小時過期
    }))

    return new Response(JSON.stringify({ 
      success: true, 
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        userTier: user.user_tier
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
        email: decoded.email,
        userTier: decoded.userTier
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
    const body = await request.json()
    const message = body.message ?? body.prompt ?? (Array.isArray(body.messages) && body.messages[0]?.content) ?? null
    const { model, user, images } = body
    
    // 檢查必要參數：至少需要 message 或 images 其中一個
    if ((!message || message.trim() === '') && (!images || images.length === 0)) {
      return new Response(JSON.stringify({ error: '缺少必要參數：需要訊息或圖片' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }
    
    if (!model) {
      return new Response(JSON.stringify({ error: '缺少必要參數：模型' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }
    
    // 驗證圖片數據（如果存在）
    if (images && Array.isArray(images) && images.length > 0) {
      // 檢查圖片數量限制
      if (images.length > 10) {
        return new Response(JSON.stringify({ error: '圖片數量超過限制（最多 10 張）' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      }
      
      // 驗證圖片格式和大小
      for (const img of images) {
        if (!img.base64 || !img.mimeType) {
          return new Response(JSON.stringify({ error: '圖片數據格式錯誤：缺少 base64 或 mimeType' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          })
        }
        
        // 驗證 mimeType
        const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!validMimeTypes.includes(img.mimeType)) {
          return new Response(JSON.stringify({ error: `不支持的圖片格式：${img.mimeType}` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          })
        }
        
        // 驗證 base64 大小（考慮 base64 編碼後增加約 33%）
        const base64Size = (img.base64.length * 3) / 4
        if (base64Size > 10 * 1024 * 1024) {
          return new Response(JSON.stringify({ error: '圖片大小超過限制（每張最大 10MB）' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
          })
        }
      }
    }

    // 生成聊天 ID
    const chatId = crypto.randomUUID()
    const timestamp = new Date().toISOString()

    // 檢查 KV 快取（非 streaming 模式才使用快取）
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    const cacheKey = `chat:${model}:${hashHex.slice(0, 32)}`
    
    // 檢查是否為 OpenAI 模型（需要 streaming）
    const isOpenAIModel = model === 'openai-gpt-3.5' || model === 'openai-gpt-5' || model === 'gpt'
    
    // 調用 AI 模型並傳遞 metadata
    const aiClient = new AIGatewayClient(env)
    
    // 建構 custom metadata
    const metadata = {}
    if (user) {
      metadata.username = user.username
      metadata.email = user.email
      metadata.userTier = user.userTier
    }
    metadata.model = aiClient.getModelDisplayName(model)

    // Debug: 記錄 metadata
    console.log('📊 Custom Metadata:', JSON.stringify(metadata, null, 2))
    console.log('👤 User data received:', user ? 'Yes' : 'No')
    console.log('🔍 Metadata keys count:', Object.keys(metadata).length)
    console.log('📋 Request body contains:', { message: !!message, model: !!model, user: !!user })

    // 如果是 OpenAI 模型，使用 streaming mode
    if (isOpenAIModel) {
      const streamResponse = await aiClient.processMessage(message, model, metadata, true, images)
      
      if (!streamResponse || !streamResponse.body) {
        throw new Error('無法獲取流式響應')
      }

      // 創建一個新的 ReadableStream 來處理 OpenAI 的流式響應
      const stream = new ReadableStream({
        async start(controller) {
          const reader = streamResponse.body.getReader()
          const decoder = new TextDecoder()
          const encoder = new TextEncoder()
          let buffer = ''
          let fullContent = ''

          try {
            while (true) {
              const { done, value } = await reader.read()
              
              if (done) {
                // 儲存完整對話記錄
                try {
                  const chatData = {
                    id: chatId,
                    userId: 'anonymous',
                    model,
                    timestamp,
                    messages: [
                      {
                        role: 'user',
                        content: message,
                        images: images && images.length > 0 ? images.map(img => ({ mimeType: img.mimeType })) : undefined,
                        timestamp
                      },
                      {
                        role: 'assistant',
                        content: fullContent,
                        timestamp: new Date().toISOString()
                      }
                    ]
                  }

                  const r2Key = `chat-${chatId}.json`
                  await env.STORAGE.put(r2Key, JSON.stringify(chatData, null, 2), {
                    httpMetadata: {
                      contentType: 'application/json',
                    }
                  })

                  await env.DB.prepare(
                    'INSERT INTO chats (id, user_id, created_at, r2_key, model) VALUES (?, ?, ?, ?, ?)'
                  ).bind(chatId, 'anonymous', timestamp, r2Key, model).run()
                } catch (storageError) {
                  console.error('儲存失敗:', storageError)
                }

                // 發送結束標記
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                controller.close()
                break
              }

              // 處理流式數據
              buffer += decoder.decode(value, { stream: true })
              const lines = buffer.split('\n')
              buffer = lines.pop() || ''

              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6)
                  if (data === '[DONE]') {
                    continue
                  }

                  try {
                    const json = JSON.parse(data)
                    const content = json.choices?.[0]?.delta?.content || ''
                    if (content) {
                      fullContent += content
                      // 發送 SSE 格式的數據
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
                    }
                  } catch (e) {
                    console.error('解析 SSE 數據失敗:', e)
                  }
                }
              }
            }
          } catch (error) {
            console.error('流式處理錯誤:', error)
            controller.error(error)
          }
        }
      })

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          ...corsHeaders
        }
      })
    }

    // 非 OpenAI 模型或非 streaming 模式，使用原有邏輯
    const cached = await env.CACHE.get(cacheKey)
    
    if (cached) {
      console.log('從快取返回結果')
      return new Response(cached, {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }

    const aiResponse = await aiClient.processMessage(message, model, metadata, false, images)
    console.log('🎯 Final AI Response to be sent to frontend:', aiResponse ? aiResponse.substring(0, 100) + '...' : 'EMPTY')

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
          images: images && images.length > 0 ? images.map(img => ({ mimeType: img.mimeType })) : undefined,
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