// API 端點配置 - 環境自動檢測
const isDevelopment = import.meta.env.DEV
const isProduction = import.meta.env.PROD

const config = {
  // 環境檢測
  isDevelopment,
  isProduction,
  
  // API 基礎 URL
  apiBaseUrl: isDevelopment 
    ? '/api'  // 本地開發：通過 Vite proxy 代理到 http://localhost:8787
    : '/api', // 生產環境：通過 Pages Functions 代理到 Workers
    
  // Workers 直接 URL（備用）
  workersUrl: isDevelopment
    ? 'http://localhost:8787/api'  // 本地 Workers
    : 'https://ai-chat-api-router.neo-cloudflare.workers.dev/api', // 生產 Workers
    
  // 環境標識
  environment: isDevelopment ? 'development' : 'production'
}

// 調試信息
console.log('🔧 Environment Config:', {
  isDevelopment: config.isDevelopment,
  isProduction: config.isProduction,
  environment: config.environment,
  apiBaseUrl: config.apiBaseUrl,
  workersUrl: config.workersUrl
})

export default config
