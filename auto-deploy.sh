#!/bin/bash

# 🤖 Cloudflare AI Chat Demo - 智能部署腳本
# 自動檢測 Worker 域名並配置前端

set -e

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${BLUE}🤖 智能部署開始...${NC}"

# 檢查依賴
echo -e "${BLUE}🔍 檢查環境...${NC}"
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ 需要安裝 Wrangler CLI${NC}"
    echo "執行: npm install -g wrangler"
    exit 1
fi

if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  請先登入 Cloudflare${NC}"
    echo "執行: wrangler login"
    exit 1
fi

# 獲取帳號資訊
ACCOUNT_INFO=$(wrangler whoami 2>/dev/null)
echo -e "${GREEN}✅ 已登入 Cloudflare${NC}"

# 部署 Workers
echo -e "${BLUE}🚀 部署 Workers...${NC}"
cd workers

echo "部署 API Router..."
ROUTER_OUTPUT=$(wrangler deploy --config wrangler-api.toml 2>&1)
ROUTER_URL=$(echo "$ROUTER_OUTPUT" | grep -o 'https://[^[:space:]]*workers\.dev' | head -1)

cd ..

if [ -z "$ROUTER_URL" ]; then
    echo -e "${YELLOW}⚠️  無法自動檢測 Worker URL，請手動配置${NC}"
    ROUTER_URL="https://ai-chat-api-router.您的帳號.workers.dev"
else
    echo -e "${GREEN}✅ 檢測到 API Router URL: $ROUTER_URL${NC}"
fi

# 更新前端配置 - 使用 Pages Function
echo -e "${BLUE}⚙️  更新前端配置...${NC}"
cat > frontend/src/env.config.js << EOF
// API 端點配置 - 自動生成
const config = {
  // 統一使用 /api 路徑
  // 本地開發：Vite proxy 代理到 Worker
  // Pages 環境：Pages Function 代理到 Worker
  apiBaseUrl: '/api'
}

export default config
EOF

# 安裝和建置前端
echo -e "${BLUE}🏗️  建置前端...${NC}"
cd frontend
npm install
npm run build

# 複製 Functions 到 dist 目錄
echo -e "${BLUE}📁 複製 Pages Functions...${NC}"
if [ -d "functions" ]; then
    cp -r functions dist/
    echo -e "${GREEN}✅ Functions 已複製到 dist/functions${NC}"
else
    echo -e "${YELLOW}⚠️  找不到 functions 目錄${NC}"
fi

# 部署到 Pages
echo -e "${BLUE}🌐 部署到 Cloudflare Pages...${NC}"
PAGES_OUTPUT=$(wrangler pages deploy dist --project-name=cloudflare-ai-chat-demo 2>&1)
PAGES_URL=$(echo "$PAGES_OUTPUT" | grep -o 'https://[^[:space:]]*\.pages\.dev' | head -1)

cd ..

# 顯示結果
echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo -e "${PURPLE}📋 部署資訊：${NC}"
echo -e "🔧 API Router: ${GREEN}$ROUTER_URL${NC}"
if [ ! -z "$PAGES_URL" ]; then
    echo -e "🌐 前端網站: ${GREEN}$PAGES_URL${NC}"
fi
echo ""

# 測試連接
echo -e "${BLUE}🧪 測試 API 連接...${NC}"
if curl -s --max-time 10 "$ROUTER_URL/api/health" | grep -q "healthy"; then
    echo -e "${GREEN}✅ API 正常運作${NC}"
else
    echo -e "${YELLOW}⚠️  API 連接測試失敗，請檢查 Worker 設定${NC}"
fi

echo ""
echo -e "${BLUE}🔧 下一步：${NC}"
echo "1. 在 Cloudflare Dashboard 設定 API Secrets："
echo "   • OPENAI_API_KEY"
echo "   • PERPLEXITY_API_KEY"
echo "   • AI_GATEWAY_URL"
echo ""
echo "2. 設定自定義域名（可選）"
echo ""
echo -e "${BLUE}🔗 重要連結：${NC}"
echo "• Cloudflare Dashboard: https://dash.cloudflare.com"
echo "• Workers 設定: https://dash.cloudflare.com/?to=/:account/workers"
if [ ! -z "$PAGES_URL" ]; then
    echo -e "• 您的應用程式: ${GREEN}$PAGES_URL${NC}"
fi 