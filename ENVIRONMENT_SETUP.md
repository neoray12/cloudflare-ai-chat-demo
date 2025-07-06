# 環境配置說明

## 環境區分

### 本地開發環境 (Development)
- **後端**: Workers 在本地運行 `http://localhost:8787`
- **前端**: Vite 開發服務器 `http://localhost:5173`
- **環境變數**: `ENVIRONMENT = "development"`
- **資料庫**: 本地 D1 資料庫

### 生產環境 (Production)
- **後端**: Workers 部署到 Cloudflare `https://ai-chat-api-router.neo-cloudflare.workers.dev`
- **前端**: Pages 部署到 Cloudflare
- **環境變數**: `ENVIRONMENT = "production"`
- **資料庫**: 遠端 D1 資料庫

## 開發流程

### 1. 本地開發

#### 啟動後端 (Terminal 1)
```bash
./dev-workers.sh
```
或
```bash
cd workers
wrangler dev --env development --config=wrangler-api.toml --port=8787
```

#### 啟動前端 (Terminal 2)
```bash
./dev-frontend.sh
```
或
```bash
cd frontend
npm run dev
```

### 2. 部署到生產環境

#### 部署後端
```bash
./deploy-workers.sh
```
或
```bash
cd workers
wrangler deploy --env production --config=wrangler-api.toml
```

#### 部署前端
```bash
cd frontend
npm run build
wrangler pages deploy dist
```

## 配置文件說明

### Workers 配置 (`workers/wrangler-api.toml`)
- 預設環境: `development`
- 生產環境: `[env.production]`
- 本地開發: `[env.development]`

### 前端配置 (`frontend/vite.config.js`)
- 本地開發: 代理到 `http://localhost:8787`
- 生產環境: 通過 Pages Functions 代理到 Workers

### API 端點
- 本地開發: `http://localhost:5173/api/*` → `http://localhost:8787/api/*`
- 生產環境: `https://your-pages-domain.pages.dev/api/*` → `https://ai-chat-api-router.neo-cloudflare.workers.dev/api/*`

## 環境變數檢查

### 後端
```javascript
console.log('當前環境:', env.ENVIRONMENT)
```

### 前端
```javascript
console.log('API 基礎 URL:', apiConfig.apiBaseUrl)
```

## 常見問題

1. **本地開發時 API 連接失敗**
   - 確保 Workers 在 `http://localhost:8787` 運行
   - 檢查 Vite 代理配置

2. **部署後 API 無法訪問**
   - 確保 Workers 已部署到 production 環境
   - 檢查 Pages Functions 代理設定

3. **環境變數不正確**
   - 檢查 `wrangler-api.toml` 中的環境設定
   - 確保使用正確的 `--env` 參數 