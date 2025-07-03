# 🚀 部署指南

## 📋 前置需求

1. Cloudflare 帳戶
2. Node.js 18+ 
3. Wrangler CLI (`npm install -g wrangler`)

## 🔑 設定 API 密鑰 (Cloudflare Secrets)

由於安全考慮，API 密鑰需要在 Cloudflare Dashboard 中設定為 Secrets：

### 方法 1：使用 Wrangler CLI (推薦)

```bash
# 設定 OpenAI API Key
wrangler secret put OPENAI_API_KEY

# 設定 Perplexity API Key  
wrangler secret put PERPLEXITY_API_KEY
```

### 方法 2：使用 Cloudflare Dashboard

1. 進入 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 選擇您的帳戶 → Workers & Pages
3. 選擇您的 Worker
4. 進入 Settings → Variables
5. 在 "Environment Variables" 區段新增：
   - `OPENAI_API_KEY`: 您的 OpenAI API 密鑰
   - `PERPLEXITY_API_KEY`: 您的 Perplexity API 密鑰

## 🛠️ 部署步驟

### 1. 安裝依賴

```bash
# 安裝根目錄依賴
npm install

# 安裝前端依賴
cd frontend && npm install

# 安裝 Workers 依賴
cd ../workers && npm install
```

### 2. 配置 Wrangler

編輯 `workers/wrangler-api.toml` 和 `workers/wrangler-consumer.toml`：

```toml
# 更新您的帳戶 ID
account_id = "YOUR_CLOUDFLARE_ACCOUNT_ID"

# 更新 AI Gateway URL
AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/YOUR_GATEWAY_NAME"
```

### 3. 創建 Cloudflare 資源

```bash
# 創建 D1 資料庫
wrangler d1 create ai-chat-db

# 創建 KV 命名空間
wrangler kv:namespace create "CACHE"

# 創建 R2 儲存桶
wrangler r2 bucket create ai-chat-storage
```

### 4. 部署 Workers

```bash
# 部署 API Router
cd workers
wrangler deploy --config wrangler-api.toml

# 部署 Queue Consumer
wrangler deploy --config wrangler-consumer.toml
```

### 5. 部署前端

```bash
cd frontend
npm run build
wrangler pages deploy dist
```

## 🔧 本地開發

### 啟動前端

```bash
cd frontend
npm run dev
```

### 啟動 Workers (開發模式)

```bash
cd workers
wrangler dev --config wrangler-api.toml
```

## 📚 相關文件

- [README.md](./README.md) - 專案概述
- [QUICKSTART.md](./QUICKSTART.md) - 快速開始
- [PROJECT_SUMMARY.md](./PROJECT_SUMMARY.md) - 專案詳細說明

## 🔒 安全注意事項

- ✅ 所有 API 密鑰都使用 Cloudflare Secrets 管理
- ✅ 沒有敏感信息存儲在代碼庫中
- ✅ 環境變數範本文件 (`env.example`) 僅包含佔位符
- ✅ `.gitignore` 排除所有敏感文件

## 🆘 故障排除

### 常見問題

1. **API 密鑰錯誤**: 確認在 Cloudflare Dashboard 中正確設定了 Secrets
2. **CORS 錯誤**: 檢查 Workers 路由配置
3. **資料庫連接失敗**: 確認 D1 資料庫 ID 正確

### 支援

如有問題，請在 GitHub 開 Issue。 