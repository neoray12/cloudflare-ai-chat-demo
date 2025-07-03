# Cloudflare AI 聊天平台 Demo

這是一個完整的 AI 聊天平台 demo，使用 Vue 3 前端和 Cloudflare Workers 後端，整合了 AI Gateway 來統一管理多個 AI 模型。

## 🏗️ 架構概述

### 前端
- **Vue 3** + **Vite** - 現代化的前端框架
- **Tailwind CSS** - 美觀的 UI 設計
- **Axios** - HTTP 請求處理

### 後端
- **Cloudflare Workers** - 無伺服器運算平台
- **AI Gateway** - 統一管理 AI 模型調用
- **Queues** - 異步任務處理
- **D1** - 關聯式資料庫（元數據）
- **R2** - 物件存儲（聊天記錄）
- **KV** - 鍵值存儲（快取）

### 支援的 AI 模型
- **Worker AI** - Cloudflare 的 AI 模型
- **OpenAI GPT** - 透過 AI Gateway
- **Perplexity** - 透過 AI Gateway

## 📁 專案結構

```
cloudflare-ai-chat-demo/
├── package.json                 # 根目錄 package.json
├── README.md                    # 專案說明文件
├── frontend/                    # Vue 3 前端
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   └── src/
│       ├── main.js
│       ├── App.vue
│       └── style.css
└── workers/                     # Cloudflare Workers 後端
    ├── package.json
    ├── wrangler-api.toml        # API Router 配置
    ├── wrangler-consumer.toml   # Queue Consumer 配置
    ├── api-router/
    │   └── index.js             # API Router Worker
    └── queue-consumer/
        └── index.js             # Queue Consumer Worker
```

## 🚀 快速開始

### 1. 安裝依賴

```bash
# 安裝根目錄和所有 workspace 的依賴
npm install

# 或者分別安裝
npm install --workspace=frontend
npm install --workspace=workers
```

### 2. 設置 Cloudflare 資源

#### 2.1 創建必要的 Cloudflare 資源

```bash
# 進入 workers 目錄
cd workers

# 創建 D1 資料庫
wrangler d1 create ai-chat-db

# 創建 KV 命名空間
wrangler kv:namespace create "CACHE"

# 創建 R2 儲存桶
wrangler r2 bucket create ai-chat-storage

# 創建 Queues
wrangler queues create ai-chat-queue
wrangler queues create ai-chat-dlq
```

#### 2.2 設置 AI Gateway

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 進入 AI Gateway 部分
3. 創建新的 Gateway：`ai-chat-gateway`
4. 複製 Gateway URL

### 3. 配置環境變數

編輯 `workers/wrangler-api.toml` 和 `workers/wrangler-consumer.toml`，替換以下佔位符：

```toml
# 替換為實際值（帳戶 ID 已設定為 Neo-Cloudflare）
AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1/5efa272dc28e4e3933324c44165b6dbe/ai-chat-gateway"
OPENAI_API_KEY = "YOUR_OPENAI_API_KEY"
PERPLEXITY_API_KEY = "YOUR_PERPLEXITY_API_KEY"
database_id = "YOUR_DATABASE_ID"
id = "YOUR_KV_ID"
```

### 4. 初始化資料庫

```bash
# 部署 Queue Consumer（包含資料庫初始化）
wrangler publish --config wrangler-consumer.toml

# 初始化資料庫架構
curl https://YOUR_CONSUMER_WORKER_URL/init-db
```

### 5. 開發環境啟動

```bash
# 啟動前端開發伺服器
npm run dev

# 在另一個終端啟動 Workers 開發伺服器
npm run dev:workers
```

## 📋 API 文檔

### 聊天 API

#### POST /api/chat
發送聊天訊息並獲取 AI 回應

**請求體：**
```json
{
  "message": "你好，請介紹一下 Cloudflare Workers",
  "model": "worker-ai"
}
```

**回應：**
```json
{
  "result": "Cloudflare Workers 是一個無伺服器計算平台..."
}
```

#### GET /api/chats
獲取所有聊天記錄列表

**回應：**
```json
{
  "chats": [
    {
      "id": "chat-uuid",
      "user_id": "anonymous",
      "created_at": "2024-01-01T00:00:00Z",
      "r2_key": "chat-uuid.json"
    }
  ]
}
```

#### GET /api/chats/:chatId
獲取特定聊天記錄

**回應：**
```json
{
  "id": "chat-uuid",
  "userId": "anonymous",
  "model": "worker-ai",
  "timestamp": "2024-01-01T00:00:00Z",
  "messages": [
    {
      "role": "user",
      "content": "你好",
      "timestamp": "2024-01-01T00:00:00Z"
    },
    {
      "role": "assistant",
      "content": "你好！我是 AI 助手",
      "timestamp": "2024-01-01T00:00:01Z"
    }
  ]
}
```

## 🔧 部署到生產環境

### 1. 部署 Workers

```bash
cd workers

# 部署兩個 Workers
npm run deploy
```

### 2. 建置並部署前端

```bash
cd frontend

# 建置前端
npm run build

# 部署到 Cloudflare Pages（選擇性）
wrangler pages publish dist
```

### 3. 設置自定義域名

在 Cloudflare Dashboard 中設置自定義域名並更新 `wrangler-api.toml` 中的 routes。

## 📊 監控和日誌

### 查看 Workers 日誌

```bash
# 查看 API Router 日誌
wrangler tail --config wrangler-api.toml

# 查看 Queue Consumer 日誌
wrangler tail --config wrangler-consumer.toml
```

### 監控 AI Gateway 使用情況

在 Cloudflare Dashboard 的 AI Gateway 部分查看：
- 請求數量
- 延遲統計
- 錯誤率
- 成本分析

## 🎯 核心功能

### 1. 多模型支援
- **Worker AI**: 免費的 Cloudflare AI 模型
- **OpenAI GPT**: 透過 AI Gateway 調用
- **Perplexity**: 透過 AI Gateway 調用

### 2. 數據存儲
- **D1 資料庫**: 存儲聊天元數據
- **R2 物件存儲**: 存儲完整聊天記錄
- **KV 快取**: 快取常見查詢結果

### 3. 異步處理
- **Queues**: 異步處理 AI 請求
- **錯誤處理**: 自動重試和死信隊列

### 4. 效能優化
- **快取策略**: 相同問題快取 1 小時
- **連接池**: 重複使用 HTTP 連接
- **批量處理**: 隊列批量處理訊息

## 🛠️ 開發指南

### 添加新的 AI 模型

1. 在 `AIGatewayClient` 類中添加新方法：

```javascript
async callNewModel(message) {
  // 實現新模型的調用邏輯
}
```

2. 在 `processMessage` 方法中添加 switch case
3. 在前端下拉選單中添加選項

### 自定義快取策略

修改 `StorageManager` 類中的 `cacheResult` 方法來調整快取 TTL。

### 添加身份驗證

1. 在 API Router 中添加認證中介軟體
2. 修改 `userId` 邏輯以從 JWT 或其他認證方式獲取

## 🔒 安全性考慮

1. **API 金鑰管理**: 使用 Cloudflare 的環境變數存儲敏感信息
2. **CORS 配置**: 限制允許的來源域名
3. **速率限制**: 在 AI Gateway 中配置速率限制
4. **輸入驗證**: 驗證和清理用戶輸入

## 💡 最佳實踐

1. **錯誤處理**: 所有 AI 調用都包含錯誤處理
2. **日誌記錄**: 詳細的日誌記錄便於除錯
3. **監控**: 使用 Cloudflare Analytics 監控效能
4. **成本控制**: 透過 AI Gateway 追蹤和控制成本

## 🤝 貢獻指南

1. Fork 專案
2. 創建功能分支
3. 提交變更
4. 發起 Pull Request

## 📄 授權條款

MIT License

## 🆘 支援與回饋

如果您遇到任何問題或有改進建議，請建立 Issue 或聯繫開發團隊。

---

**注意**: 這是一個 demo 專案，在生產環境中使用前請確保完成適當的安全性審查和效能測試。 