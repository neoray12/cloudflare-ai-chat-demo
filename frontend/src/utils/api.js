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
  // 發送聊天訊息
  sendMessage: (message, model, user = null) => {
    return apiClient.post('/chat', { 
      model, 
      messages: [
        {
          role: 'user',
          content: message
        }
      ],
      user 
    })
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