// AI Gateway 和各種 AI 模型的整合
class AIGatewayClient {
  constructor(env) {
    this.env = env
    this.gatewayUrl = env.AI_GATEWAY_URL
  }

  async callWorkerAI(message) {
    try {
      const response = await this.env.AI.run('@cf/meta/llama-2-7b-chat-int8', {
        messages: [{ role: 'user', content: message }]
      })
      
      return response.response
    } catch (error) {
      console.error('Worker AI 調用失敗:', error)
      throw error
    }
  }

  async callOpenAI(message) {
    try {
      const response = await fetch(`${this.gatewayUrl}/openai/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: message }],
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API 錯誤: ${response.status}`)
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
      const response = await fetch(`${this.gatewayUrl}/perplexity/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.env.PERPLEXITY_API_KEY}`
        },
        body: JSON.stringify({
          model: 'llama-3.1-sonar-small-128k-online',
          messages: [{ role: 'user', content: message }],
          max_tokens: 1000
        })
      })

      if (!response.ok) {
        throw new Error(`Perplexity API 錯誤: ${response.status}`)
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

// 資料庫操作類
class DatabaseManager {
  constructor(env) {
    this.env = env
  }

  async saveChatMetadata(chatId, userId, r2Key) {
    try {
      await this.env.DB.prepare(
        'INSERT INTO chats (id, user_id, created_at, r2_key) VALUES (?, ?, ?, ?)'
      ).bind(chatId, userId, new Date().toISOString(), r2Key).run()
    } catch (error) {
      console.error('保存聊天元數據失敗:', error)
      throw error
    }
  }

  async updateChatMetadata(chatId, status) {
    try {
      await this.env.DB.prepare(
        'UPDATE chats SET status = ?, updated_at = ? WHERE id = ?'
      ).bind(status, new Date().toISOString(), chatId).run()
    } catch (error) {
      console.error('更新聊天狀態失敗:', error)
      throw error
    }
  }
}

// 儲存管理類
class StorageManager {
  constructor(env) {
    this.env = env
  }

  async saveChatToR2(chatId, chatData) {
    try {
      const key = `chat-${chatId}.json`
      await this.env.STORAGE.put(key, JSON.stringify(chatData, null, 2), {
        httpMetadata: {
          contentType: 'application/json',
        }
      })
      return key
    } catch (error) {
      console.error('保存聊天到 R2 失敗:', error)
      throw error
    }
  }

  async cacheResult(cacheKey, result, ttl = 3600) {
    try {
      await this.env.CACHE.put(cacheKey, JSON.stringify(result), {
        expirationTtl: ttl
      })
    } catch (error) {
      console.error('快取結果失敗:', error)
      throw error
    }
  }

  async setTemporaryResult(chatId, result) {
    try {
      await this.env.CACHE.put(`result:${chatId}`, JSON.stringify(result), {
        expirationTtl: 300 // 5分鐘過期
      })
    } catch (error) {
      console.error('設定臨時結果失敗:', error)
      throw error
    }
  }
}

// 佇列消費者處理函數
async function processQueueMessage(batch, env) {
  const aiClient = new AIGatewayClient(env)
  const dbManager = new DatabaseManager(env)
  const storageManager = new StorageManager(env)

  for (const message of batch.messages) {
    try {
      const { id: chatId, message: userMessage, model, timestamp, userId } = message.body
      
      console.log(`處理聊天任務: ${chatId}, 模型: ${model}`)

      // 呼叫 AI 模型
      const aiResponse = await aiClient.processMessage(userMessage, model)

      // 建立完整的聊天記錄
      const chatData = {
        id: chatId,
        userId,
        model,
        timestamp,
        messages: [
          {
            role: 'user',
            content: userMessage,
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
      const r2Key = await storageManager.saveChatToR2(chatId, chatData)

      // 儲存元數據到 D1
      await dbManager.saveChatMetadata(chatId, userId, r2Key)

      // 快取結果
      const cacheKey = `chat:${model}:${btoa(userMessage).slice(0, 32)}`
      await storageManager.cacheResult(cacheKey, { result: aiResponse })

      // 設定臨時結果供 API Router 使用
      await storageManager.setTemporaryResult(chatId, { result: aiResponse })

      console.log(`聊天任務完成: ${chatId}`)
      
      // 標記訊息為成功
      message.ack()

    } catch (error) {
      console.error(`處理聊天任務失敗:`, error)
      
      // 設定錯誤結果
      const errorResult = { error: '處理失敗，請稍後再試' }
      await storageManager.setTemporaryResult(message.body.id, errorResult)
      
      // 標記訊息為失敗
      message.ack()
    }
  }
}

// 初始化資料庫架構
async function initializeDatabase(env) {
  try {
    await env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT,
        r2_key TEXT NOT NULL,
        status TEXT DEFAULT 'completed'
      )
    `).run()

    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id)
    `).run()

    await env.DB.prepare(`
      CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at)
    `).run()

    console.log('資料庫初始化完成')
  } catch (error) {
    console.error('資料庫初始化失敗:', error)
  }
}

export default {
  async queue(batch, env) {
    await processQueueMessage(batch, env)
  },

  async fetch(request, env) {
    // 處理 HTTP 請求（用於健康檢查等）
    const url = new URL(request.url)
    
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'healthy' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (url.pathname === '/init-db') {
      await initializeDatabase(env)
      return new Response(JSON.stringify({ status: 'database initialized' }), {
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    })
  }
} 