<template>
  <v-container fluid class="login-container">
    <v-row justify="center" align="center" class="fill-height">
      <v-col cols="12" sm="8" md="6" lg="4" xl="3">
        <v-card class="elevation-8" rounded="lg">
          <v-card-text class="pa-8">
            <!-- Cloudflare Logo -->
            <div class="text-center mb-6">
              <img 
                ref="logoRef"
                src="/CF_logomark.png" 
                alt="Cloudflare Logo"
                class="logo-img"
                @error="handleLogoError"
                v-if="!showFallbackIcon"
              />
              <!-- 如果標誌載入失敗，顯示替代圖標 -->
              <v-icon 
                v-if="showFallbackIcon" 
                class="logo-fallback" 
                size="64"
                color="#F38020"
              >
                mdi-cloud
              </v-icon>
              <h2 class="mt-3 text-h4 font-weight-bold text-orange">
                Cloudflare AI Demo Chat Login 登入
              </h2>
            </div>

            <!-- 登錄表單 -->
            <v-form @submit.prevent="handleLogin" ref="loginForm">
              <v-text-field
                v-model="username"
                label="用戶名"
                prepend-inner-icon="mdi-account"
                variant="outlined"
                :rules="usernameRules"
                :error-messages="usernameErrors"
                class="mb-4"
                required
              />

              <v-text-field
                v-model="password"
                label="密碼"
                prepend-inner-icon="mdi-lock"
                :type="showPassword ? 'text' : 'password'"
                :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                @click:append-inner="showPassword = !showPassword"
                variant="outlined"
                :rules="passwordRules"
                :error-messages="passwordErrors"
                class="mb-4"
                required
              />

              <!-- Turnstile Widget - 根據環境顯示 -->
              <div v-if="apiConfig.isProduction" class="mb-6 text-center">
                <div ref="turnstileWidget" class="turnstile-widget"></div>
              </div>
              
              <!-- 開發環境提示 -->
              <div v-if="apiConfig.isDevelopment" class="mb-6 text-center">
                <v-alert type="info" variant="tonal" density="compact">
                  <v-icon start icon="mdi-shield-off"></v-icon>
                  開發環境：已跳過 Turnstile 驗證
                </v-alert>
              </div>

              <!-- 錯誤訊息 -->
              <v-alert
                v-if="errorMessage"
                type="error"
                variant="tonal"
                class="mb-4"
              >
                {{ errorMessage }}
              </v-alert>

              <!-- 登錄按鈕 -->
              <v-btn
                type="submit"
                :loading="isLoading"
                :disabled="apiConfig.isProduction && !turnstileToken"
                block
                size="large"
                color="primary"
                class="mb-4"
              >
                登錄
              </v-btn>
            </v-form>

            <!-- 環境和測試提示 -->
            <div class="text-center text-caption text-medium-emphasis">
              <div class="mb-2">
                <v-chip 
                  :color="apiConfig.isDevelopment ? 'orange' : 'green'" 
                  variant="outlined" 
                  size="small"
                >
                  {{ apiConfig.environment.toUpperCase() }}
                </v-chip>
              </div>
              <div>測試帳號：neo / 密碼：neo</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import apiConfig from '../env.config.js'

// 響應式狀態
const username = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errorMessage = ref('')
const turnstileToken = ref('')
const logoRef = ref(null)
const loginForm = ref(null)
const turnstileWidget = ref(null)
const showFallbackIcon = ref(false)

// 表單驗證規則
const usernameRules = [
  v => !!v || '請輸入用戶名',
  v => v.length >= 3 || '用戶名至少需要3個字符'
]

const passwordRules = [
  v => !!v || '請輸入密碼',
  v => v.length >= 3 || '密碼至少需要3個字符'
]

const usernameErrors = ref([])
const passwordErrors = ref([])

// Turnstile 相關
let turnstileWidgetId = null

// 處理 Logo 載入錯誤
const handleLogoError = () => {
  showFallbackIcon.value = true
}

// 載入 Turnstile 腳本
const loadTurnstileScript = () => {
  return new Promise((resolve, reject) => {
    if (window.turnstile) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
    script.async = true
    script.defer = true
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

// 初始化 Turnstile Widget
const initTurnstile = async () => {
  try {
    await loadTurnstileScript()
    
    if (window.turnstile && turnstileWidget.value) {
      turnstileWidgetId = window.turnstile.render(turnstileWidget.value, {
        sitekey: '0x4AAAAAABjiDXSsDRrHRmpr', // 測試用的 sitekey
        callback: (token) => {
          turnstileToken.value = token
        },
        'error-callback': () => {
          turnstileToken.value = ''
          errorMessage.value = 'Turnstile 驗證失敗，請重試'
        }
      })
    }
  } catch (error) {
    console.error('Turnstile 初始化失敗:', error)
    errorMessage.value = '安全驗證載入失敗，請刷新頁面重試'
  }
}

// 處理登錄
const handleLogin = async () => {
  // 清除之前的錯誤
  errorMessage.value = ''
  usernameErrors.value = []
  passwordErrors.value = []

  // 驗證表單
  const { valid } = await loginForm.value.validate()
  if (!valid) return

  // 根據環境檢查 Turnstile 驗證
  if (apiConfig.isProduction && !turnstileToken.value) {
    errorMessage.value = '請完成安全驗證'
    return
  }

  isLoading.value = true

  try {
    // 根據環境選擇 API 端點
    const apiUrl = `${apiConfig.apiBaseUrl}/auth/login`
    
    console.log(`🔗 Login API (${apiConfig.environment}):`, apiUrl)
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
        ...(apiConfig.isProduction && { turnstileToken: turnstileToken.value })
      })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      // 登錄成功，儲存 token
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      
      // 觸發事件通知父組件
      window.dispatchEvent(new CustomEvent('loginSuccess', { 
        detail: { user: data.user, token: data.token } 
      }))
      
    } else {
      errorMessage.value = data.error || '登錄失敗'
      
      // 生產環境重置 Turnstile
      if (apiConfig.isProduction && window.turnstile && turnstileWidgetId) {
        window.turnstile.reset(turnstileWidgetId)
        turnstileToken.value = ''
      }
    }
  } catch (error) {
    console.error('登錄錯誤:', error)
    errorMessage.value = '網絡錯誤，請檢查連接'
  } finally {
    isLoading.value = false
  }
}

// 生命週期
onMounted(() => {
  // 只在生產環境初始化 Turnstile
  if (apiConfig.isProduction) {
    console.log('🔒 Production environment: Initializing Turnstile')
    initTurnstile()
  } else {
    console.log('🔧 Development environment: Skipping Turnstile')
  }
})

onUnmounted(() => {
  // 只在生產環境清理 Turnstile
  if (apiConfig.isProduction && window.turnstile && turnstileWidgetId) {
    window.turnstile.remove(turnstileWidgetId)
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #F38020 0%, #003682 100%);
}

.logo-img {
  width: auto;
  height: 80px;
  max-width: 120px;
  display: block;
  margin: 0 auto;
  object-fit: contain;
}

.turnstile-widget {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 65px;
}

.v-card {
  border: none;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.text-primary {
  color: #003682 !important;
}

.text-orange {
  color: #F38020 !important;
}

.v-btn {
  text-transform: none;
  font-weight: 600;
}
</style> 