import axios from 'axios'
import apiConfig from '../env.config.js'

// 創建專用的 API 客戶端
const apiClient = axios.create({
  baseURL: apiConfig.apiBaseUrl,
  timeout: 30000, // 30 秒超時
  headers: {
    'Content-Type': 'application/json',
  }
})

// 請求攔截器 - 調試用
apiClient.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request (${apiConfig.environment}):`, {
      method: config.method?.toUpperCase(),
      url: config.url,
      baseURL: config.baseURL,
      fullURL: `${config.baseURL}${config.url}`,
      environment: apiConfig.environment
    })
    return config
  },
  (error) => {
    console.error('❌ Request Error:', error)
    return Promise.reject(error)
  }
)

// 響應攔截器 - 錯誤處理
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ API Response:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    })
    return response
  },
  (error) => {
    console.error('❌ API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      fullURL: `${error.config?.baseURL}${error.config?.url}`,
      data: error.response?.data
    })
    return Promise.reject(error)
  }
)

// API 方法
export const chatAPI = {
  // 發送聊天訊息（支持流式響應和圖片）
  sendMessage: async (message, model, user = null, onStream = null, images = null) => {
    // 檢查是否為 OpenAI 模型（需要 streaming）
    const isOpenAIModel = model === 'openai-gpt-3.5' || model === 'openai-gpt-5' || model === 'gpt'
    
    // 構建請求體
    const requestBody = {
      model,
      message,
      user
    }
    
    // 如果有圖片，添加到請求體
    if (images && images.length > 0) {
      requestBody.images = images
    }
    
    if (isOpenAIModel) {
      // 使用流式響應
      const response = await fetch(`${apiConfig.apiBaseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch (e) {
          errorData = { error: errorText }
        }
        throw { response: { status: response.status, data: errorData } }
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          return { data: { result: fullContent } }
        }

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
              const content = json.content || ''
              if (content) {
                fullContent += content
                if (onStream) {
                  onStream(content, fullContent)
                }
              }
            } catch (e) {
              console.error('解析 SSE 數據失敗:', e)
            }
          }
        }
      }
    } else {
      // 非流式響應（原有邏輯）
      const requestBody = {
        model,
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        user
      }
      
      // 如果有圖片，添加到請求體
      if (images && images.length > 0) {
        requestBody.images = images
      }
      
      return apiClient.post('/chat', requestBody)
    }
  },
  
  // 健康檢查
  healthCheck: () => {
    return apiClient.get('/health')
  },
  
  // 獲取聊天歷史
  getChatHistory: (chatId) => {
    return apiClient.get(`/chats/${chatId}`)
  },
  
  // 獲取所有聊天
  getAllChats: () => {
    return apiClient.get('/chats')
  }
}

export default apiClient 