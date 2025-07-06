#!/bin/bash

# 前端本地開發腳本
# 啟動 Vite 開發服務器

echo "🎨 啟動前端開發環境"
echo "=================="

# 切換到 frontend 目錄
cd frontend

# 安裝依賴（如果需要）
if [ ! -d "node_modules" ]; then
  echo "📦 安裝前端依賴..."
  npm install
fi

# 啟動開發服務器（development 模式）
echo "🌐 前端將代理 API 請求到: http://localhost:8787"
npm run dev

echo "🌐 前端開發服務器: http://localhost:5173" 