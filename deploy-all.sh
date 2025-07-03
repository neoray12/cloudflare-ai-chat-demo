#!/bin/bash

# 🚀 Cloudflare AI Chat Demo - 一鍵部署腳本
# 此腳本將部署 Workers 和 Pages 到 Cloudflare

set -e  # 遇到錯誤立即退出

echo "🚀 開始部署 Cloudflare AI Chat Demo..."

# 顏色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 檢查 wrangler 是否安裝
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI 未安裝${NC}"
    echo "請執行: npm install -g wrangler"
    exit 1
fi

# 檢查是否已登入 Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  請先登入 Cloudflare${NC}"
    echo "執行: wrangler login"
    exit 1
fi

echo -e "${BLUE}📋 部署計劃：${NC}"
echo "1. 安裝所有依賴"
echo "2. 部署 Workers (API Router + Queue Consumer)"
echo "3. 建置並部署前端到 Pages"
echo "4. 配置域名和路由"
echo ""

# 步驟 1: 安裝依賴
echo -e "${BLUE}📦 步驟 1: 安裝依賴...${NC}"
echo "安裝根目錄依賴..."
npm install

echo "安裝前端依賴..."
cd frontend
npm install
cd ..

echo "安裝 Workers 依賴..."
cd workers
npm install
cd ..

echo -e "${GREEN}✅ 依賴安裝完成${NC}"

# 步驟 2: 部署 Workers
echo -e "${BLUE}🔧 步驟 2: 部署 Workers...${NC}"
cd workers

echo "部署 API Router Worker..."
wrangler deploy --config wrangler-api.toml

echo "部署 Queue Consumer Worker..."
wrangler deploy --config wrangler-consumer.toml

cd ..
echo -e "${GREEN}✅ Workers 部署完成${NC}"

# 步驟 3: 建置前端
echo -e "${BLUE}🏗️  步驟 3: 建置前端...${NC}"
cd frontend

# 設定正確的 API 端點
echo "配置 API 端點..."
if [ ! -f .env.production ]; then
    cat > .env.production << EOF
VITE_API_BASE_URL=https://ai-chat-api-router.YOUR_SUBDOMAIN.workers.dev
EOF
    echo -e "${YELLOW}⚠️  請編輯 frontend/.env.production 設定正確的 Worker 域名${NC}"
fi

npm run build
cd ..

echo -e "${GREEN}✅ 前端建置完成${NC}"

# 步驟 4: 部署到 Pages
echo -e "${BLUE}🌐 步驟 4: 部署到 Cloudflare Pages...${NC}"
cd frontend

# 部署到 Pages
wrangler pages deploy dist --project-name=cloudflare-ai-chat-demo

cd ..

echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo -e "${BLUE}📋 部署摘要：${NC}"
echo -e "Workers: ${GREEN}✅ 已部署${NC}"
echo -e "Pages: ${GREEN}✅ 已部署${NC}"
echo ""
echo -e "${YELLOW}🔧 後續設定：${NC}"
echo "1. 在 Cloudflare Dashboard 設定 API Secrets"
echo "2. 配置自定義域名 (可選)"
echo "3. 設定正確的 API 端點 URL"
echo ""
echo -e "${BLUE}🔗 有用的連結：${NC}"
echo "• Cloudflare Dashboard: https://dash.cloudflare.com"
echo "• Workers & Pages: https://dash.cloudflare.com/?to=/:account/workers"
echo "• 部署指南: ./DEPLOYMENT.md" 