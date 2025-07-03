# 🚀 快速入門指南

這是一個 5 分鐘快速設置指南，讓您快速體驗 Cloudflare AI Chat Demo。

## 📋 前置需求

1. **Node.js 16+** 和 **npm**
2. **Cloudflare 帳戶**（免費即可）
3. **Wrangler CLI** - 執行 `npm install -g wrangler`

## ⚡ 一鍵部署

### 1. 複製專案並安裝依賴

```bash
# 複製專案（如果從 GitHub）
git clone [your-repo-url]
cd cloudflare-ai-chat-demo

# 安裝依賴
npm install
```

### 2. 登入 Cloudflare

```bash
wrangler login
```

### 3. 執行自動部署腳本

```bash
./deploy.sh
```

這個腳本會自動：
- 建立 D1 資料庫
- 建立 KV 命名空間
- 建立 R2 儲存桶
- 建立 Queues
- 更新配置文件
- 部署 Workers
- 建置前端

## 🔧 手動設置 AI Gateway

部署腳本完成後，您需要手動設置 AI Gateway：

### 1. 建立 AI Gateway

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 導航至 **AI Gateway**
3. 點擊 **Create Gateway**
4. 輸入名稱：`ai-chat-gateway`
5. 複製 Gateway URL

### 2. 更新 API 金鑰

編輯 `workers/wrangler-api.toml` 和 `workers/wrangler-consumer.toml`：

```toml
# 更新這些值（帳戶 ID 已設定為 Neo-Cloudflare）
AI_GATEWAY_URL = "https://gateway.ai.cloudflare.com/v1/5efa272dc28e4e3933324c44165b6dbe/ai-chat-gateway"
OPENAI_API_KEY = "sk-your-openai-key"          # 可選
PERPLEXITY_API_KEY = "pplx-your-perplexity-key"  # 可選
```

### 3. 重新部署

```bash
cd workers
wrangler publish --config wrangler-api.toml
wrangler publish --config wrangler-consumer.toml
```

## 🎯 開始使用

### 開發環境

```bash
# 啟動前端（在一個終端）
npm run dev

# 啟動 Workers（在另一個終端）
npm run dev:workers
```

訪問 `http://localhost:5173` 開始使用！

### 生產環境

Workers 已經部署，您可以：
1. 訪問 Worker 的 URL
2. 或者將前端部署到 Cloudflare Pages：

```bash
cd frontend
npm run build
wrangler pages publish dist
```

## 🧪 測試功能

### 1. 基本聊天測試

- 開啟應用程式
- 選擇 **Worker AI** 模型
- 輸入：「你好，請介紹自己」
- 點擊發送

### 2. 測試不同模型

如果您設置了 OpenAI 或 Perplexity API 金鑰：
- 切換到 **GPT** 或 **Perplexity** 模型
- 嘗試不同的問題

### 3. 查看快取效果

- 發送相同問題兩次
- 第二次應該更快（從快取返回）

## 📊 監控和除錯

### 查看 Workers 日誌

```bash
# API Router 日誌
wrangler tail --config workers/wrangler-api.toml

# Queue Consumer 日誌
wrangler tail --config workers/wrangler-consumer.toml
```

### 查看資料庫

```bash
wrangler d1 execute ai-chat-db --command "SELECT * FROM chats LIMIT 10"
```

### 檢查 KV 快取

```bash
wrangler kv:key list --namespace-id YOUR_KV_ID
```

## 🔍 常見問題

### Q: Worker AI 模型無響應
**A:** 確保您的帳戶已啟用 Workers AI。檢查 Workers 日誌中的錯誤訊息。

### Q: API 調用失敗
**A:** 檢查：
1. AI Gateway URL 是否正確
2. API 金鑰是否有效
3. 是否有足夠的配額

### Q: 佇列處理緩慢
**A:** 檢查：
1. Queue Consumer 是否正常部署
2. 檢查 Queue Consumer 日誌
3. 確認 Queue 綁定正確

### Q: 資料庫錯誤
**A:** 確認：
1. D1 資料庫 ID 正確
2. Schema 已正確執行
3. 檢查 D1 連接權限

## 💡 進階設置

### 自定義域名

1. 在 `workers/wrangler-api.toml` 中設置：
```toml
routes = ["your-domain.com/api/*"]
```

2. 重新部署 Workers

### 效能調優

1. 調整 Queue 設定：
```toml
max_batch_size = 10
max_batch_timeout = 30
```

2. 調整快取 TTL：
```javascript
const cacheTTL = 3600; // 1 小時
```

### 監控設置

1. 啟用 Cloudflare Analytics
2. 設置 AI Gateway 監控警報
3. 使用 Wrangler 監控 Workers 效能

## 📞 獲得幫助

- 查看完整的 [README.md](./README.md) 文檔
- 檢查 [Cloudflare Workers 文檔](https://developers.cloudflare.com/workers/)
- 查看 [AI Gateway 文檔](https://developers.cloudflare.com/ai-gateway/)

## 🎉 成功！

恭喜！您已經成功設置了 Cloudflare AI Chat Demo。現在可以：

1. ✅ 使用多種 AI 模型進行聊天
2. ✅ 體驗異步隊列處理
3. ✅ 查看快取效果
4. ✅ 監控 AI Gateway 使用情況
5. ✅ 擴展和自定義功能

享受您的 AI 聊天平台！🚀 