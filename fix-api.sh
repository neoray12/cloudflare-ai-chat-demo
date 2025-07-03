#!/bin/bash

# 🔧 API 連接問題快速修復腳本

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔧 修復 API 連接問題...${NC}"

# 檢查 wrangler
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ 需要安裝 Wrangler CLI${NC}"
    echo "執行: npm install -g wrangler"
    exit 1
fi

# 檢查登入狀態
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  請先登入 Cloudflare${NC}"
    wrangler login
fi

# 檢測現有的 Worker URL
echo -e "${BLUE}🔍 檢測 API Router Worker...${NC}"
cd workers

# 嘗試獲取 Worker 列表
WORKERS_LIST=$(wrangler deployments list --name ai-chat-api-router 2>/dev/null || echo "")

if [[ $WORKERS_LIST == *"ai-chat-api-router"* ]]; then
    # Worker 存在，獲取 URL
    ACCOUNT_ID=$(wrangler whoami | grep "Account ID" | cut -d: -f2 | tr -d ' ')
    if [ ! -z "$ACCOUNT_ID" ]; then
        ROUTER_URL="https://ai-chat-api-router.$ACCOUNT_ID.workers.dev"
    else
        # 備用方法：部署並捕獲 URL
        DEPLOY_OUTPUT=$(wrangler deploy --config wrangler-api.toml 2>&1)
        ROUTER_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^[:space:]]*workers\.dev' | head -1)
    fi
else
    echo -e "${YELLOW}⚠️  Worker 不存在，正在部署...${NC}"
    DEPLOY_OUTPUT=$(wrangler deploy --config wrangler-api.toml 2>&1)
    ROUTER_URL=$(echo "$DEPLOY_OUTPUT" | grep -o 'https://[^[:space:]]*workers\.dev' | head -1)
fi

cd ..

if [ -z "$ROUTER_URL" ]; then
    echo -e "${RED}❌ 無法檢測 Worker URL${NC}"
    echo "請手動編輯 frontend/env.config.js"
    exit 1
fi

echo -e "${GREEN}✅ 檢測到 API URL: $ROUTER_URL${NC}"

# 更新前端配置
echo -e "${BLUE}📝 更新前端配置...${NC}"
cat > frontend/env.config.js << EOF
// API 端點配置 - 自動修復生成
const config = {
  development: {
    apiBaseUrl: 'http://localhost:8787'
  },
  production: {
    apiBaseUrl: '$ROUTER_URL'
  }
}

// 根據環境變數決定使用哪個配置
const isDevelopment = import.meta.env.MODE === 'development'
const currentConfig = isDevelopment ? config.development : config.production

export default currentConfig
EOF

# 測試 API
echo -e "${BLUE}🧪 測試 API 連接...${NC}"
if curl -s --max-time 10 "$ROUTER_URL/api/health" | grep -q "healthy"; then
    echo -e "${GREEN}✅ API 連接正常${NC}"
    
    # 重新建置前端（如果需要）
    echo -e "${BLUE}🏗️  重新建置和部署前端...${NC}"
    cd frontend
    npm run build
    
    # 自動重新部署到 Pages
    echo -e "${BLUE}🌐 重新部署到 Cloudflare Pages...${NC}"
    PAGES_OUTPUT=$(wrangler pages deploy dist --project-name=cloudflare-ai-chat-demo 2>&1)
    PAGES_URL=$(echo "$PAGES_OUTPUT" | grep -o 'https://[^[:space:]]*\.pages\.dev' | head -1)
    
    echo -e "${GREEN}✅ 修復完成！${NC}"
    echo -e "API URL: ${GREEN}$ROUTER_URL${NC}"
    if [ ! -z "$PAGES_URL" ]; then
        echo -e "前端網站: ${GREEN}$PAGES_URL${NC}"
    fi
    echo ""
    echo -e "${BLUE}📝 測試方法：${NC}"
    echo "1. 打開瀏覽器開發者工具 (F12)"
    echo "2. 查看 Console 標籤"
    echo "3. 尋找 '🚀 API Request' 日誌"
    echo "4. 確認 fullURL 指向 Worker 域名"
    
else
    echo -e "${RED}❌ API 連接失敗${NC}"
    echo "可能的原因："
    echo "1. API Secrets 未設定 (OPENAI_API_KEY, PERPLEXITY_API_KEY)"
    echo "2. Worker 綁定設定錯誤"
    echo "3. 網路連接問題"
    echo ""
    echo "請檢查 Cloudflare Dashboard 中的 Worker 設定"
fi 