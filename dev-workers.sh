#!/bin/bash

# Workers 本地開發腳本
# 使用 development 環境在本地運行

echo "🔧 啟動 Workers 本地開發環境"
echo "============================"

# 切換到 workers 目錄
cd workers

# 啟動本地開發服務器
wrangler dev --env development --config=wrangler-api.toml --port=8787

echo "🌐 本地開發服務器: http://localhost:8787" 