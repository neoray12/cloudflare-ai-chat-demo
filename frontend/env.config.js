// API 端點配置 - 自動生成
const config = {
  development: {
    apiBaseUrl: 'http://localhost:8787'
  },
  production: {
    apiBaseUrl: 'https://ai-chat-api-router.neo-cloudflare.workers.dev'
  }
}

// 根據環境變數決定使用哪個配置
const isDevelopment = import.meta.env.MODE === 'development'
const currentConfig = isDevelopment ? config.development : config.production

export default currentConfig
