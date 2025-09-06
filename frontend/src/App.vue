<template>
  <v-app>
    <!-- 登錄頁面 -->
    <Login v-if="!isAuthenticated" />
    
    <!-- 聊天界面 -->
    <div v-else>
      <!-- 應用程式頂部欄 -->
      <v-app-bar 
        color="primary"  
        dark
        app
        style="position: relative;"
      >
        <!-- 主題切換按鈕 - 絕對定位到右邊 -->
        <v-btn 
          icon 
          @click="toggleTheme"
          size="small"
          style="position: absolute; right: 80px; top: 50%; transform: translateY(-50%);"
        >
          <v-icon>{{ isDarkTheme ? 'mdi-weather-sunny' : 'mdi-weather-night' }}</v-icon>
        </v-btn>
        
        <!-- 登出按鈕 -->
        <v-btn 
          icon 
          @click="logout"
          size="small"
          style="position: absolute; right: 16px; top: 50%; transform: translateY(-50%);"
        >
          <v-icon>mdi-logout</v-icon>
        </v-btn>
        
        <!-- 完全置中的 Logo 和 Title -->
        <div class="d-flex justify-center align-center w-100">
          <!-- Cloudflare Logo -->
          <img
            src="/CF_logomark_singlecolor_wht.png"
            alt="Cloudflare Logo"
            class="mr-2"
            style="height: 36px; width: auto; filter: brightness(0) invert(1);"
            @error="onLogoError"
            v-if="!showFallbackIcon"
          />
          <!-- 如果標誌載入失敗，顯示替代圖標 -->
          <v-icon 
            v-if="showFallbackIcon" 
            class="mr-2" 
            size="32"
          >
            mdi-cloud
          </v-icon>
          <span class="text-h6 font-weight-bold">Cloudflare AI Chat Demo</span>
        </div>
      </v-app-bar>

      <!-- 主要內容區域 -->
      <v-main style="background-color: #f5f6f8; padding: 0;">
        <v-container fluid class="pa-2" style="width: 75%; margin: 0 auto;">
          <v-row justify="center" class="ma-0">
            <!-- 聊天區域 -->
            <v-col cols="12" class="pa-0">
              <v-card 
                class="d-flex flex-column" 
                elevation="0"
                color="surface"
                style="height: calc(100vh - 64px); border-radius: 0;"
              >
                <!-- 用戶歡迎區域 -->
                <v-card-text class="py-2 px-3 flex-shrink-0">
                  <div class="text-center mb-2">
                    <v-chip color="primary" variant="flat" size="small">
                      <v-icon start>mdi-account</v-icon>
                      歡迎, {{ currentUser?.username }}
                    </v-chip>
                    <!-- 用戶等級顯示 -->
                    <v-chip 
                      :color="currentUser?.userTier === 'vip' ? 'amber' : 'grey'" 
                      variant="flat" 
                      size="x-small" 
                      class="ml-2"
                    >
                      <v-icon start>{{ currentUser?.userTier === 'vip' ? 'mdi-crown' : 'mdi-account-outline' }}</v-icon>
                      {{ currentUser?.userTier === 'vip' ? 'VIP' : 'Regular' }}
                    </v-chip>
                  </div>
                </v-card-text>

                <!-- 模型選擇區域 -->
                <v-card-text class="py-2 px-3 flex-shrink-0">
                  <v-row justify="center">
                    <v-col cols="12" md="6" lg="4">
                      <v-select
                        v-model="selectedModel"
                        :items="modelOptions"
                        item-title="name"
                        item-value="value"
                        label="選擇 AI 模型"
                        prepend-icon="mdi-brain"
                        color="primary"
                        variant="outlined"
                        density="compact"
                        :disabled="isLoading"
                      >
                        <template v-slot:item="{ props, item }">
                          <v-list-item v-bind="props" :title="item.raw.name">
                            <template v-slot:prepend>
                              <v-icon :color="item.raw.color">{{ item.raw.icon }}</v-icon>
                            </template>
                            <template v-slot:subtitle>
                              {{ item.raw.description }}
                            </template>
                          </v-list-item>
                        </template>
                      </v-select>
                    </v-col>
                  </v-row>
                </v-card-text>

                <v-divider></v-divider>

                <!-- 聊天訊息區域 -->
                <div 
                  class="flex-grow-1 overflow-y-auto pa-4 text-left"
                  style="min-height: 200px; max-height: calc(100vh - 280px);"
                  ref="chatContainer"
                >
                  <v-container class="py-4">
                    <template v-for="message in messages" :key="message.id">
                      <!-- 用戶訊息 -->
                      <v-row 
                        v-if="message.role === 'user'" 
                        justify="end" 
                        class="mb-3"
                      >
                        <v-col cols="auto" style="max-width: 75%;">
                          <v-card 
                            color="user-bubble"
                            elevation="1"
                            rounded="xl"
                          >
                            <v-card-text class="pa-4 text-left">
                              <div class="d-flex justify-space-between align-start mb-2">
                                <v-chip size="x-small" color="white" variant="flat" rounded="lg">
                                  <v-icon start size="small">mdi-account</v-icon>
                                  你
                                </v-chip>
                                <v-btn
                                  icon
                                  size="x-small"
                                  variant="text"
                                  color="white"
                                  @click="copyMessage(message.content)"
                                >
                                  <v-icon size="small">mdi-content-copy</v-icon>
                                </v-btn>
                              </div>
                              <div class="text-white text-left" style="white-space: pre-wrap; word-wrap: break-word;">
                                {{ message.content }}
                              </div>
                              <div class="text-caption text-orange-lighten-4 mt-2 opacity-75 text-left">
                                {{ formatTime(message.timestamp) }}
                              </div>
                            </v-card-text>
                          </v-card>
                        </v-col>
                      </v-row>

                      <!-- AI 訊息 -->
                      <v-row v-else class="mb-3">
                        <v-col cols="auto" style="max-width: 75%;">
                          <v-card 
                            color="surface"
                            elevation="1"
                            rounded="xl"
                            border
                          >
                            <v-card-text class="pa-4">
                              <div class="d-flex justify-space-between align-start mb-3">
                                <v-chip size="small" color="ai-bubble" variant="flat" rounded="lg">
                                  <v-icon start size="small">mdi-robot</v-icon>
                                  {{ getModelName(selectedModel) }}
                                </v-chip>
                                <div class="message-actions">
                                  <v-btn
                                    icon
                                    size="x-small"
                                    variant="text"
                                    color="primary"
                                    @click="copyMessage(message.content)"
                                  >
                                    <v-icon size="small">mdi-content-copy</v-icon>
                                  </v-btn>
                                  <v-btn
                                    icon
                                    size="x-small"
                                    variant="text"
                                    color="primary"
                                    @click="regenerateMessage(message)"
                                    :loading="isLoading"
                                    class="ml-1"
                                  >
                                    <v-icon size="small">mdi-refresh</v-icon>
                                  </v-btn>
                                </div>
                              </div>
                              <MarkdownIt 
                                :source="message.content"
                                class="markdown-content text-left"
                              />
                              <div class="text-caption text-medium-emphasis mt-3 text-left">
                                {{ formatTime(message.timestamp) }}
                              </div>
                            </v-card-text>
                          </v-card>
                        </v-col>
                      </v-row>
                    </template>

                    <!-- 載入中提示 -->
                    <v-row v-if="isLoading" class="mb-3">
                      <v-col cols="auto">
                        <v-card 
                          color="surface"
                          elevation="1"
                          rounded="xl"
                          border
                        >
                          <v-card-text class="pa-4">
                            <div class="d-flex align-center">
                              <v-progress-circular
                                indeterminate
                                size="20"
                                width="3"
                                color="primary"
                                class="mr-3"
                              />
                              <span class="text-medium-emphasis">AI 正在思考中...</span>
                            </div>
                          </v-card-text>
                        </v-card>
                      </v-col>
                    </v-row>
                  </v-container>
                </div>

                <v-divider></v-divider>

                <!-- 輸入區域 -->
                <div class="flex-shrink-0 pa-4">
                  <div class="d-flex align-end ga-2">
                    <v-textarea
                      v-model="userInput"
                      label="輸入您的問題..."
                      variant="outlined"
                      auto-grow
                      rows="1"
                      max-rows="5"
                      color="primary"
                      :disabled="isLoading"
                      @keydown.ctrl.enter.prevent="sendMessage"
                      @keydown.meta.enter.prevent="sendMessage"
                    ></v-textarea>
                    <v-btn
                      :disabled="isLoading || !userInput.trim()"
                      :loading="isLoading"
                      color="primary"
                      size="large"
                      icon
                      @click="sendMessage"
                    >
                      <v-icon>mdi-send</v-icon>
                    </v-btn>
                  </div>
                </div>
              </v-card>
            </v-col>
          </v-row>
        </v-container>
      </v-main>
    </div>

    <!-- 錯誤提示 -->
    <v-snackbar
      v-model="showError"
      color="error"
      timeout="5000"
      location="top"
    >
      <v-icon class="mr-2">mdi-alert</v-icon>
      {{ error }}
      <template v-slot:actions>
        <v-btn
          color="white"
          variant="text"
          @click="showError = false"
        >
          關閉
        </v-btn>
      </template>
    </v-snackbar>

    <!-- 成功提示 -->
    <v-snackbar
      v-model="showSuccess"
      color="success"
      timeout="2000"
      location="top"
    >
      <v-icon class="mr-2">mdi-check</v-icon>
      {{ successMessage }}
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { useTheme } from 'vuetify'
import MarkdownIt from 'vue3-markdown-it'
import { chatAPI } from './utils/api.js'
import Login from './components/Login.vue'

// 響應式狀態
const theme = useTheme()
const selectedModel = ref('worker-ai')
const userInput = ref('')
const messages = ref([])
const isLoading = ref(false)
const error = ref('')
const showError = ref(false)
const showSuccess = ref(false)
const successMessage = ref('')
const chatContainer = ref(null)
const showFallbackIcon = ref(false)

// 認證相關狀態
const isAuthenticated = ref(false)
const currentUser = ref(null)
const authToken = ref(null)

// 標誌載入錯誤處理
const onLogoError = () => {
  showFallbackIcon.value = true
}

// 模型選項
const modelOptions = ref([
  {
    name: 'Worker AI',
    value: 'worker-ai',
    description: 'Cloudflare Workers AI',
    icon: 'mdi-cloud',
    color: 'orange'
  },
  {
    name: 'GPT-3.5 Turbo',
    value: 'gpt',
    description: 'OpenAI GPT-3.5 - 強大的語言模型',
    icon: 'mdi-brain',
    color: 'green'
  },
  {
    name: 'Perplexity',
    value: 'perplexity',
    description: 'Perplexity AI - 即時搜尋增強',
    icon: 'mdi-magnify',
    color: 'purple'
  }
])

// 計算屬性
const isDarkTheme = computed(() => theme.global.current.value.dark)

// 認證方法
const checkAuth = () => {
  const token = localStorage.getItem('authToken')
  const userStr = localStorage.getItem('user')
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr)
      authToken.value = token
      currentUser.value = user
      isAuthenticated.value = true
    } catch (error) {
      console.error('解析用戶信息失敗:', error)
      logout()
    }
  }
}

const logout = () => {
  localStorage.removeItem('authToken')
  localStorage.removeItem('user')
  authToken.value = null
  currentUser.value = null
  isAuthenticated.value = false
  messages.value = []
  userInput.value = ''
  
  successMessage.value = '已成功登出'
  showSuccess.value = true
}

// 方法
const toggleTheme = () => {
  theme.global.name.value = theme.global.current.value.dark ? 'light' : 'dark'
}

const getModelName = (value) => {
  const model = modelOptions.value.find(m => m.value === value)
  return model ? model.name : value
}

const sendMessage = async () => {
  if (!userInput.value.trim()) return

  const userMessage = {
    id: Date.now(),
    role: 'user',
    content: userInput.value,
    timestamp: new Date()
  }

  messages.value.push(userMessage)
  const question = userInput.value
  userInput.value = ''
  isLoading.value = true
  error.value = ''
  showError.value = false

  // 滾動到底部
  await nextTick()
  scrollToBottom()

  try {
    const response = await chatAPI.sendMessage(question, selectedModel.value, currentUser.value)

    const aiMessage = {
      id: Date.now() + 1,
      role: 'assistant',
      content: response.data.result,
      timestamp: new Date()
    }

    messages.value.push(aiMessage)
    
    // 滾動到底部
    await nextTick()
    scrollToBottom()
    
  } catch (err) {
    error.value = err.response?.data?.error || '發送訊息時發生錯誤'
    showError.value = true
  } finally {
    isLoading.value = false
  }
}

const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const copyMessage = async (content) => {
  try {
    await navigator.clipboard.writeText(content)
    successMessage.value = '已複製到剪貼簿'
    showSuccess.value = true
  } catch (err) {
    console.error('複製失敗:', err)
    error.value = '複製失敗，請手動複製'
    showError.value = true
  }
}

// 滾動到底部
const scrollToBottom = () => {
  if (chatContainer.value) {
    const container = chatContainer.value.$el || chatContainer.value
    container.scrollTop = container.scrollHeight
  }
}

const regenerateMessage = async (message) => {
  // 找到對應的用戶訊息
  const messageIndex = messages.value.findIndex(m => m.id === message.id)
  if (messageIndex === -1) return

  const userMessageIndex = messageIndex - 1
  if (userMessageIndex < 0) return

  const userMessage = messages.value[userMessageIndex]
  if (userMessage.role !== 'user') return

  // 移除舊的 AI 回應
  messages.value.splice(messageIndex, 1)

  isLoading.value = true
  error.value = ''
  showError.value = false

  try {
    const response = await chatAPI.sendMessage(userMessage.content, selectedModel.value, currentUser.value)

    const newAiMessage = {
      id: Date.now(),
      role: 'assistant',
      content: response.data.result,
      timestamp: new Date()
    }

    messages.value.splice(messageIndex, 0, newAiMessage)
    
    // 滾動到底部
    await nextTick()
    scrollToBottom()
    
  } catch (err) {
    error.value = err.response?.data?.error || '重新生成訊息時發生錯誤'
    showError.value = true
  } finally {
    isLoading.value = false
  }
}

// 初始化歡迎訊息
const initWelcomeMessage = () => {
  if (messages.value.length === 0) {
    messages.value.push({
      id: 0,
      role: 'assistant',
      content: `你好！我是 Cloudflare AI 助手 👋

我可以協助您：
- 📝 回答各種問題
- 💻 協助程式設計
- 🔍 提供資訊查詢 
- 🎓 學習新知識

請選擇一個 AI 模型，然後開始對話吧！`,
      timestamp: new Date()
    })
  }
}

// 監聽登錄成功事件
const handleLoginSuccess = (event) => {
  const { user, token } = event.detail
  authToken.value = token
  currentUser.value = user
  isAuthenticated.value = true
  
  // 初始化歡迎訊息
  initWelcomeMessage()
  
  successMessage.value = `歡迎回來，${user.username}！`
  showSuccess.value = true
}

// 生命週期
onMounted(() => {
  checkAuth()
  
  // 監聽登錄成功事件
  window.addEventListener('loginSuccess', handleLoginSuccess)
  
  // 如果已登錄，初始化歡迎訊息
  if (isAuthenticated.value) {
    initWelcomeMessage()
  }
})
</script>

<style scoped>
/* Markdown 內容樣式 */
:deep(.markdown-content) {
  line-height: 1.6;
}

:deep(.markdown-content h1),
:deep(.markdown-content h2),
:deep(.markdown-content h3),
:deep(.markdown-content h4),
:deep(.markdown-content h5),
:deep(.markdown-content h6) {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  font-weight: 600;
}

:deep(.markdown-content p) {
  margin-bottom: 1em;
}

:deep(.markdown-content ul),
:deep(.markdown-content ol) {
  margin-left: 1.5em;
  margin-bottom: 1em;
}

:deep(.markdown-content li) {
  margin-bottom: 0.25em;
}

:deep(.markdown-content code) {
  background-color: rgba(0, 0, 0, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
}

:deep(.markdown-content pre) {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 1em;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1em 0;
}

:deep(.markdown-content pre code) {
  background-color: transparent;
  padding: 0;
}

:deep(.markdown-content blockquote) {
  border-left: 4px solid #f38020;
  padding-left: 1em;
  margin: 1em 0;
  color: rgba(0, 0, 0, 0.7);
  font-style: italic;
}

:deep(.markdown-content table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

:deep(.markdown-content th),
:deep(.markdown-content td) {
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 8px 12px;
  text-align: left;
}

:deep(.markdown-content th) {
  background-color: rgba(0, 0, 0, 0.05);
  font-weight: 600;
}
</style>

