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
                              <img 
                                :src="item.raw.iconImage" 
                                :alt="item.raw.name"
                                class="model-icon model-icon-spacing"
                                style="width: 24px; height: 24px; object-fit: contain;"
                              />
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

                <!-- 圖片上傳區域（僅 GPT-5 時顯示） -->
                <v-card-text v-if="showImageUpload" class="py-2 px-3 flex-shrink-0">
                  <v-row justify="center">
                    <v-col cols="12" md="8" lg="6">
                      <v-file-input
                        v-model="imageFiles"
                        label="上傳圖片（最多 10 張，每張最大 10MB）"
                        prepend-icon="mdi-image"
                        variant="outlined"
                        density="compact"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        :disabled="isLoading"
                        @change="handleImageSelection"
                        show-size
                        hide-details="auto"
                      ></v-file-input>
                      
                      <!-- 圖片預覽區域 -->
                      <div v-if="selectedImages.length > 0" class="mt-3">
                        <div class="text-caption text-medium-emphasis mb-2">
                          已選擇 {{ selectedImages.length }} / 10 張圖片
                        </div>
                        <div class="d-flex flex-wrap ga-2">
                          <v-card
                            v-for="(image, index) in selectedImages"
                            :key="index"
                            class="image-preview-card"
                            elevation="2"
                            style="position: relative; width: 120px; height: 120px;"
                          >
                            <v-img
                              :src="image.preview"
                              cover
                              style="width: 100%; height: 100%;"
                            ></v-img>
                            <v-btn
                              icon
                              size="small"
                              color="error"
                              variant="flat"
                              style="position: absolute; top: 4px; right: 4px;"
                              @click="removeImage(index)"
                            >
                              <v-icon size="small">mdi-close</v-icon>
                            </v-btn>
                            <div class="text-caption text-center pa-1" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.6); color: white;">
                              {{ formatFileSize(image.file.size) }}
                            </div>
                          </v-card>
                        </div>
                      </div>
                      
                      <!-- 錯誤提示 -->
                      <v-alert
                        v-if="imageUploadError"
                        type="error"
                        variant="tonal"
                        density="compact"
                        class="mt-2"
                        closable
                        @click:close="imageUploadError = ''"
                      >
                        {{ imageUploadError }}
                      </v-alert>
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
                              <!-- 圖片預覽 -->
                              <div v-if="message.images && message.images.length > 0" class="mb-3">
                                <div class="d-flex flex-wrap ga-2">
                                  <v-card
                                    v-for="(image, index) in message.images"
                                    :key="index"
                                    class="image-message-preview"
                                    elevation="2"
                                    style="position: relative; width: 120px; height: 120px;"
                                  >
                                    <v-img
                                      :src="image.preview"
                                      cover
                                      style="width: 100%; height: 100%;"
                                    ></v-img>
                                  </v-card>
                                </div>
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
                                  <img 
                                    :src="getModelIcon(message.model || selectedModel)" 
                                    :alt="getModelName(message.model || selectedModel)"
                                    class="model-icon-small mr-2"
                                    style="width: 16px; height: 16px; object-fit: contain;"
                                  />
                                  {{ getModelName(message.model || selectedModel) }}
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
                      :disabled="isLoading || (!userInput.trim() && selectedImages.length === 0)"
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
    <!-- 錯誤對話框 - 支援詳細的 Firewall 錯誤資訊 -->
    <v-dialog
      v-model="showError"
      max-width="600"
      persistent
    >
      <v-card>
        <v-card-title class="d-flex align-center">
          <v-icon color="error" class="mr-2">
            {{ error.includes('Cloudflare Firewall') ? 'mdi-shield-alert' : 'mdi-alert' }}
          </v-icon>
          {{ error.includes('Cloudflare Firewall') ? '安全防護攔截' : '發生錯誤' }}
        </v-card-title>
        
        <v-card-text>
          <pre class="error-message">{{ error }}</pre>
        </v-card-text>
        
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            color="primary"
            variant="text"
            @click="showError = false"
          >
            我知道了
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

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

<style scoped>
.error-message {
  font-family: 'Roboto', sans-serif;
  font-size: 14px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  background-color: rgba(255, 0, 0, 0.05);
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #f44336;
  margin: 0;
  max-height: 400px;
  overflow-y: auto;
}

.error-message::-webkit-scrollbar {
  width: 6px;
}

.error-message::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.error-message::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.error-message::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.model-icon {
  border-radius: 4px;
  transition: transform 0.2s ease;
}

.model-icon:hover {
  transform: scale(1.1);
}

.model-icon-small {
  border-radius: 2px;
  vertical-align: middle;
}

.model-icon-spacing {
  margin-right: 12px !important;
}
</style>

<script setup>
import { ref, onMounted, computed, nextTick, watch } from 'vue'
import { useTheme } from 'vuetify'
import MarkdownIt from 'vue3-markdown-it'
import { chatAPI } from './utils/api.js'
import Login from './components/Login.vue'

// 響應式狀態
const theme = useTheme()
const selectedModel = ref('workers-ai-gpt-oss-120b')
const userInput = ref('')
const messages = ref([])
const isLoading = ref(false)
const error = ref('')
const showError = ref(false)
const showSuccess = ref(false)
const successMessage = ref('')
const chatContainer = ref(null)
const showFallbackIcon = ref(false)

// 圖片上傳相關狀態
const selectedImages = ref([]) // 存儲選中的圖片 {file, preview, base64}
const imageUploadError = ref('')

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
    name: 'Workers AI (gpt-oss-120b)',
    value: 'workers-ai-gpt-oss-120b',
    description: 'OpenAI 開源 120B 參數模型 - 生產級高推理能力',
    iconImage: '/workers-ai.svg',
    color: 'orange'
  },
  {
    name: 'Workers AI (gpt-oss-20b)',
    value: 'workers-ai-gpt-oss-20b',
    description: 'OpenAI 開源 20B 參數模型 - 低延遲專用',
    iconImage: '/workers-ai.svg',
    color: 'orange'
  },
  // 暫時移除 DeepSeek 模型，直到確認正確的路徑
  // {
  //   name: 'Workers AI (deepseek-r1-distill-qwen-32b)',
  //   value: 'workers-ai-deepseek-r1',
  //   description: 'DeepSeek 推理模型 - 強化推理和思考能力',
  //   iconImage: '/workers-ai.svg',
  //   color: 'blue'
  // },
  {
    name: 'Workers AI (llama-3.1-8b)',
    value: 'workers-ai-llama',
    description: 'Meta Llama 3.1 8B - 多語言對話模型',
    iconImage: '/workers-ai.svg',
    color: 'orange'
  },
  {
    name: 'OpenAI (gpt-3.5)',
    value: 'openai-gpt-3.5',
    description: 'OpenAI GPT-3.5 Turbo - 強大的語言模型',
    iconImage: '/gpt.png',
    color: 'green'
  },
  {
    name: 'OpenAI (gpt-5)',
    value: 'openai-gpt-5',
    description: 'OpenAI GPT-5 - 最新一代語言模型',
    iconImage: '/gpt.png',
    color: 'green'
  },
  {
    name: 'Perplexity (sonar)',
    value: 'perplexity-sonar',
    description: 'Perplexity AI - 即時搜尋增強',
    iconImage: '/perplexity.png',
    color: 'purple'
  }
])

// 計算屬性
const isDarkTheme = computed(() => theme.global.current.value.dark)
const showImageUpload = computed(() => selectedModel.value === 'openai-gpt-5')

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

const getModelIcon = (value) => {
  const model = modelOptions.value.find(m => m.value === value)
  return model ? model.iconImage : '/workers-ai.svg'
}

// 圖片處理相關變數和函數
const imageFiles = ref(null)

// 圖片處理工具函數
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

const validateImageFormat = (file) => {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp']
  return validTypes.includes(file.type)
}

const validateImageSize = (file) => {
  // 限制 10MB（考慮 base64 編碼後會增加約 33%）
  const maxSize = 7 * 1024 * 1024 // 7MB，base64 後約 10MB
  return file.size <= maxSize
}

const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result.split(',')[1] // 移除 data:image/...;base64, 前綴
      const mimeType = file.type
      resolve({ base64, mimeType })
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const handleImageSelection = async (files) => {
  imageUploadError.value = ''
  
  if (!files || files.length === 0) {
    selectedImages.value = []
    return
  }

  // 檢查總數限制
  if (selectedImages.value.length + files.length > 10) {
    imageUploadError.value = '最多只能上傳 10 張圖片'
    return
  }

  const newImages = []

  for (const file of Array.from(files)) {
    // 驗證格式
    if (!validateImageFormat(file)) {
      imageUploadError.value = `${file.name} 格式不支持，僅支持 JPG、PNG、WebP`
      continue
    }

    // 驗證大小
    if (!validateImageSize(file)) {
      imageUploadError.value = `${file.name} 大小超過限制（最大 7MB）`
      continue
    }

    try {
      // 創建預覽
      const preview = URL.createObjectURL(file)
      
      // 轉換為 base64
      const { base64, mimeType } = await convertToBase64(file)

      newImages.push({
        file,
        preview,
        base64,
        mimeType
      })
    } catch (error) {
      console.error('圖片處理錯誤:', error)
      imageUploadError.value = `處理 ${file.name} 時發生錯誤`
    }
  }

  selectedImages.value = [...selectedImages.value, ...newImages]
}

const removeImage = (index) => {
  // 釋放預覽 URL
  if (selectedImages.value[index].preview) {
    URL.revokeObjectURL(selectedImages.value[index].preview)
  }
  selectedImages.value.splice(index, 1)
}

// 當切換模型時，清除圖片
watch(selectedModel, () => {
  selectedImages.value.forEach(img => {
    if (img.preview) {
      URL.revokeObjectURL(img.preview)
    }
  })
  selectedImages.value = []
  imageUploadError.value = ''
})

const sendMessage = async () => {
  if (!userInput.value.trim() && selectedImages.value.length === 0) return

  // 準備圖片數據（僅 base64 和 mimeType）
  const imagesData = selectedImages.value.map(img => ({
    base64: img.base64,
    mimeType: img.mimeType
  }))

  const userMessage = {
    id: Date.now(),
    role: 'user',
    content: userInput.value,
    images: selectedImages.value.length > 0 ? selectedImages.value.map(img => ({
      preview: img.preview,
      mimeType: img.mimeType
    })) : undefined,
    timestamp: new Date()
  }

  messages.value.push(userMessage)
  const question = userInput.value
  const imagesToSend = imagesData.length > 0 ? imagesData : null
  userInput.value = ''
  
  // 清除選中的圖片
  selectedImages.value.forEach(img => {
    if (img.preview) {
      URL.revokeObjectURL(img.preview)
    }
  })
  selectedImages.value = []
  imageFiles.value = null
  
  isLoading.value = true
  error.value = ''
  showError.value = false

  // 滾動到底部
  await nextTick()
  scrollToBottom()

  try {
    // 檢查是否為 OpenAI 模型（需要 streaming）
    const isOpenAIModel = selectedModel.value === 'openai-gpt-3.5' || selectedModel.value === 'openai-gpt-5' || selectedModel.value === 'gpt'
    
    if (isOpenAIModel) {
      // 使用流式響應
      let aiMessageId = Date.now() + 1
      const aiMessage = {
        id: aiMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        model: selectedModel.value
      }
      
      messages.value.push(aiMessage)
      
      // 流式響應處理
      const response = await chatAPI.sendMessage(
        question,
        selectedModel.value,
        currentUser.value,
        (chunk, fullContent) => {
          // 更新 AI 消息內容
          const messageIndex = messages.value.findIndex(m => m.id === aiMessageId)
          if (messageIndex !== -1) {
            messages.value[messageIndex].content = fullContent
            // 滾動到底部
            nextTick(() => {
              scrollToBottom()
            })
          }
        },
        imagesToSend
      )
    } else {
      // 非流式響應（原有邏輯）
      const response = await chatAPI.sendMessage(question, selectedModel.value, currentUser.value, null, imagesToSend)

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.result,
        timestamp: new Date(),
        model: selectedModel.value
      }

      messages.value.push(aiMessage)
      
      // 滾動到底部
      await nextTick()
      scrollToBottom()
    }
    
  } catch (err) {
    console.error('聊天錯誤:', err)
    console.error('完整錯誤物件:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      headers: err.response?.headers,
      data: err.response?.data,
      dataType: typeof err.response?.data
    })
    
    // 檢查是否為 429 限流錯誤
    if (err.response?.data?.details && err.response.data.details.includes('Error Code 429')) {
      error.value = err.response.data.details
    } 
    // 檢查是否為 DLP 政策錯誤 (500 或 424)
    else if ((err.response?.status === 500 || err.response?.status === 424) && 
             err.response?.data?.details && 
             err.response.data.details.includes('DLP policy violations')) {
      const rayId = err.response.headers['cf-ray'] || '未知'
      const statusCode = err.response.status
      const details = err.response.data.details
      
      // 解析 DLP 錯誤詳情
      let dlpReason = '內容違反資料外洩防護政策'
      try {
        const errorMatch = details.match(/"message":"([^"]+)"/)
        if (errorMatch) {
          dlpReason = errorMatch[1]
        }
      } catch (e) {
        console.log('解析 DLP 錯誤訊息失敗:', e)
      }
      
      error.value = `AI Gateway DLP 規則觸發

狀態碼: ${statusCode}
Ray ID: ${rayId}
原因: ${dlpReason}

您的請求內容被 Cloudflare AI Gateway 的資料外洩防護 (DLP) 政策攔截。請檢查您的輸入內容是否符合安全規範。`
    } 
    // 檢查是否為 AI Gateway 一般性攔截（如 Prompt 被安全設定攔截）
    else if ((err.response?.status === 424 || err.response?.status === 400 || err.response?.status === 403 || err.response?.status === 451 || err.response?.status === 500) &&
             err.response?.data?.details && 
             err.response.data.details.includes('AI Gateway')) {
      const details = err.response.data.details
      // 嘗試從 details 內的 JSON 字串解析出 error 陣列的 code 與 message
      let gatewayCode = '未知'
      let gatewayMessage = '請求被 AI Gateway 攔截'
      try {
        const jsonStart = details.indexOf('{')
        const jsonEnd = details.lastIndexOf('}')
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = details.slice(jsonStart, jsonEnd + 1)
          const parsed = JSON.parse(jsonStr)
          if (Array.isArray(parsed.error) && parsed.error.length > 0) {
            gatewayCode = parsed.error[0].code ?? gatewayCode
            gatewayMessage = parsed.error[0].message ?? gatewayMessage
          }
        }
      } catch (e) {
        console.log('解析 AI Gateway 錯誤詳情失敗，回退為原文:', e)
        // 回退：若無法解析，就顯示 details 原文
        gatewayMessage = details
      }
      error.value = `你的問題已被 AI Gateway 擋下\n\n代碼: ${gatewayCode}\n訊息: ${gatewayMessage}`
    } else {
      // 其他錯誤使用原有的 Cloudflare Firewall 錯誤處理
      const errorDetails = await parseCloudflareError(err.response)
      error.value = formatErrorMessage(errorDetails)
    }
    
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

// 解析 Cloudflare Firewall 錯誤
const parseCloudflareError = async (errorResponse) => {
  let errorDetails = {
    type: 'general',
    message: '發送訊息時發生錯誤',
    statusCode: null,
    rayId: null,
    userIP: null,
    isFirewallBlock: false
  }

  if (!errorResponse) return errorDetails

  // 獲取狀態碼
  errorDetails.statusCode = errorResponse.status

  // 檢查是否為 Cloudflare Firewall 錯誤 (403)
  if (errorResponse.status === 403) {
    try {
      // 嘗試獲取 HTML 響應內容
      let htmlText = ''
      
      // 處理不同類型的響應數據
      if (typeof errorResponse.data === 'string') {
        htmlText = errorResponse.data
      } else if (errorResponse.data && typeof errorResponse.data === 'object') {
        htmlText = JSON.stringify(errorResponse.data)
      } else if (errorResponse.responseText) {
        htmlText = errorResponse.responseText
      }
      
      console.log('403 錯誤響應內容 (前 500 字符):', htmlText.substring(0, 500))
      console.log('響應內容總長度:', htmlText.length)
      console.log('包含關鍵字檢查:', {
        'Cloudflare Ray ID': htmlText.includes('Cloudflare Ray ID'),
        'Ray ID': htmlText.includes('Ray ID'),
        'security service': htmlText.includes('security service'),
        'Sorry, you have been blocked': htmlText.includes('Sorry, you have been blocked'),
        'Firewall for AI': htmlText.includes('Firewall for AI')
      })
      
      // 檢查是否包含 Cloudflare 錯誤頁面標識
      if (htmlText.includes('Cloudflare Ray ID') || 
          htmlText.includes('security service') || 
          htmlText.includes('Sorry, you have been blocked') ||
          htmlText.includes('Firewall for AI')) {
        
        errorDetails.isFirewallBlock = true
        errorDetails.type = 'firewall'
        errorDetails.message = '您的請求被 Cloudflare Firewall for AI 安全防護攔截'
        
        // 提取 Ray ID - 多種匹配模式
        let rayIdMatch = htmlText.match(/Cloudflare Ray ID[:\s]*([a-f0-9]{16,})/i) ||
                        htmlText.match(/Ray ID[:\s]*([a-f0-9]{16,})/i) ||
                        htmlText.match(/ray[_\-\s]*id[:\s]*([a-f0-9]{16,})/i)
        
        if (rayIdMatch) {
          errorDetails.rayId = rayIdMatch[1]
          console.log('✅ 提取到 Ray ID:', rayIdMatch[1])
        } else {
          console.log('❌ 未能提取 Ray ID，嘗試其他模式...')
          // 嘗試更寬鬆的匹配
          rayIdMatch = htmlText.match(/([a-f0-9]{16,})/i)
          if (rayIdMatch) {
            errorDetails.rayId = rayIdMatch[1]
            console.log('✅ 寬鬆匹配到 Ray ID:', rayIdMatch[1])
          }
        }
        
        // 提取 IP 地址 - 多種匹配模式
        let ipMatch = htmlText.match(/Your IP[:\s]*[^0-9]*([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/i) ||
                     htmlText.match(/IP[:\s]*[^0-9]*([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/i) ||
                     htmlText.match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/i)
        
        if (ipMatch) {
          errorDetails.userIP = ipMatch[1]
          console.log('✅ 提取到 IP 地址:', ipMatch[1])
        } else {
          console.log('❌ 未能提取 IP 地址')
        }
      } else {
        // 即使沒有明確的 Cloudflare 標識，403 錯誤也可能是防火牆攔截
        errorDetails.isFirewallBlock = true
        errorDetails.type = 'firewall'
        errorDetails.message = '請求被安全防護系統攔截 (403 Forbidden)'
      }
    } catch (parseError) {
      console.error('解析 Cloudflare 錯誤失敗:', parseError)
      // 即使解析失敗，403 錯誤也很可能是防火牆攔截
      errorDetails.isFirewallBlock = true
      errorDetails.type = 'firewall'
      errorDetails.message = '請求被安全防護系統攔截 (403 Forbidden)'
    }
  }

  // 如果不是 Firewall 錯誤，嘗試獲取一般錯誤訊息
  if (!errorDetails.isFirewallBlock) {
    errorDetails.message = errorResponse.data?.error || errorDetails.message
  }

  return errorDetails
}

// 格式化錯誤訊息顯示
const formatErrorMessage = (errorDetails) => {
  if (!errorDetails.isFirewallBlock) {
    return errorDetails.message
  }

  let message = `🛡️ ${errorDetails.message}\n\n`
  message += `📋 詳細資訊：\n`
  message += `• 錯誤代碼：${errorDetails.statusCode} Forbidden\n`
  
  if (errorDetails.rayId) {
    message += `• Ray ID：${errorDetails.rayId}\n`
  }
  
  if (errorDetails.userIP) {
    message += `• 您的 IP：${errorDetails.userIP}\n`
  }
  
  message += `• 原因：AI 安全防護系統偵測到可疑內容\n\n`
  message += `💡 解決方法：\n`
  message += `• 請修改您的訊息內容\n`
  message += `• 避免使用敏感詞彙或特殊字符\n`
  message += `• 如持續發生，請聯繫管理員`
  
  return message
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
      timestamp: new Date(),
      model: selectedModel.value
    }

    messages.value.splice(messageIndex, 0, newAiMessage)
    
    // 滾動到底部
    await nextTick()
    scrollToBottom()
    
  } catch (err) {
    console.error('重新生成錯誤:', err)
    
    // 檢查是否為 429 限流錯誤
    if (err.response?.data?.details && err.response.data.details.includes('Error Code 429')) {
      error.value = err.response.data.details
    } 
    // 檢查是否為 DLP 政策錯誤 (500 或 424)
    else if ((err.response?.status === 500 || err.response?.status === 424) && 
             err.response?.data?.details && 
             err.response.data.details.includes('DLP policy violations')) {
      const rayId = err.response.headers['cf-ray'] || '未知'
      const statusCode = err.response.status
      const details = err.response.data.details
      
      // 解析 DLP 錯誤詳情
      let dlpReason = '內容違反資料外洩防護政策'
      try {
        const errorMatch = details.match(/"message":"([^"]+)"/)
        if (errorMatch) {
          dlpReason = errorMatch[1]
        }
      } catch (e) {
        console.log('解析 DLP 錯誤訊息失敗:', e)
      }
      
      error.value = `AI Gateway DLP 規則觸發

狀態碼: ${statusCode}
Ray ID: ${rayId}
原因: ${dlpReason}

您的請求內容被 Cloudflare AI Gateway 的資料外洩防護 (DLP) 政策攔截。請檢查您的輸入內容是否符合安全規範。`
    } 
    // 檢查是否為 AI Gateway 一般性攔截（如 Prompt 被安全設定攔截）
    else if ((err.response?.status === 424 || err.response?.status === 400 || err.response?.status === 403 || err.response?.status === 451 || err.response?.status === 500) &&
             err.response?.data?.details && 
             err.response.data.details.includes('AI Gateway')) {
      const details = err.response.data.details
      let gatewayCode = '未知'
      let gatewayMessage = '請求被 AI Gateway 攔截'
      try {
        const jsonStart = details.indexOf('{')
        const jsonEnd = details.lastIndexOf('}')
        if (jsonStart !== -1 && jsonEnd !== -1) {
          const jsonStr = details.slice(jsonStart, jsonEnd + 1)
          const parsed = JSON.parse(jsonStr)
          if (Array.isArray(parsed.error) && parsed.error.length > 0) {
            gatewayCode = parsed.error[0].code ?? gatewayCode
            gatewayMessage = parsed.error[0].message ?? gatewayMessage
          }
        }
      } catch (e) {
        console.log('解析 AI Gateway 錯誤詳情失敗，回退為原文:', e)
        gatewayMessage = details
      }
      error.value = `你的問題已被 AI Gateway 擋下\n\n代碼: ${gatewayCode}\n訊息: ${gatewayMessage}`
    } else {
      // 其他錯誤使用原有的 Cloudflare Firewall 錯誤處理
      const errorDetails = await parseCloudflareError(err.response)
      error.value = formatErrorMessage(errorDetails)
    }
    
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

