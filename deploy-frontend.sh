#!/bin/bash

# 前端部署腳本
# 構建並部署到 Cloudflare Pages

echo "🎨 構建並部署前端到 Cloudflare Pages (production 環境)"
echo "================================================="

# 切換到 frontend 目錄
cd frontend

# 安裝依賴（如果需要）
if [ ! -d "node_modules" ]; then
  echo "📦 安裝前端依賴..."
  npm install
fi

# 構建生產版本
echo "🔨 構建生產版本..."
npm run build

# 部署到 Cloudflare Pages
echo "🚀 部署到 Cloudflare Pages..."
wrangler pages deploy dist

echo "✅ 前端部署完成！"
echo "🌐 前端將通過 Pages Functions 代理到 Workers API" 