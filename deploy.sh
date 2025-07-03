#!/bin/bash

# Cloudflare AI Chat Demo 部署腳本
# 這個腳本會自動建立所需的 Cloudflare 資源並部署應用程式

set -e

echo "🚀 開始部署 Cloudflare AI Chat Demo"
echo "=================================="

# 檢查是否安裝了 wrangler
if ! command -v wrangler &> /dev/null; then
    echo "❌ 錯誤: wrangler CLI 未安裝"
    echo "請先安裝 wrangler: npm install -g wrangler"
    exit 1
fi

# 檢查是否已經登入
if ! wrangler whoami &> /dev/null; then
    echo "❌ 錯誤: 尚未登入 Cloudflare"
    echo "請先登入: wrangler login"
    exit 1
fi

# 進入 workers 目錄
cd workers

echo "📦 步驟 1: 建立 Cloudflare 資源"
echo "================================"

# 建立 D1 資料庫
echo "建立 D1 資料庫..."
DB_OUTPUT=$(wrangler d1 create ai-chat-db)
DB_ID=$(echo "$DB_OUTPUT" | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2)
echo "✅ D1 資料庫已建立: $DB_ID"

# 建立 KV 命名空間
echo "建立 KV 命名空間..."
KV_OUTPUT=$(wrangler kv:namespace create "CACHE")
KV_ID=$(echo "$KV_OUTPUT" | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
echo "✅ KV 命名空間已建立: $KV_ID"

# 建立 R2 儲存桶
echo "建立 R2 儲存桶..."
wrangler r2 bucket create ai-chat-storage
echo "✅ R2 儲存桶已建立"

# 建立 Queues
echo "建立 Queues..."
wrangler queues create ai-chat-queue
wrangler queues create ai-chat-dlq
echo "✅ Queues 已建立"

echo "📝 步驟 2: 更新配置文件"
echo "========================"

# 設定帳戶 ID
ACCOUNT_ID="5efa272dc28e4e3933324c44165b6dbe"

# 更新 wrangler-api.toml
echo "更新 wrangler-api.toml..."
sed -i.bak "s/YOUR_DATABASE_ID/$DB_ID/g" wrangler-api.toml
sed -i.bak "s/YOUR_KV_ID/$KV_ID/g" wrangler-api.toml
# 帳戶 ID 已經在配置文件中設定，無需替換

# 更新 wrangler-consumer.toml
echo "更新 wrangler-consumer.toml..."
sed -i.bak "s/YOUR_DATABASE_ID/$DB_ID/g" wrangler-consumer.toml
sed -i.bak "s/YOUR_KV_ID/$KV_ID/g" wrangler-consumer.toml
# 帳戶 ID 已經在配置文件中設定，無需替換

echo "✅ 配置文件已更新"

echo "🗄️ 步驟 3: 初始化資料庫"
echo "========================"

# 執行資料庫 schema
echo "執行資料庫 schema..."
wrangler d1 execute ai-chat-db --file=schema.sql
echo "✅ 資料庫 schema 已建立"

echo "🔧 步驟 4: 部署 Workers"
echo "======================"

# 部署 Queue Consumer 首先
echo "部署 Queue Consumer..."
wrangler publish --config wrangler-consumer.toml

# 部署 API Router
echo "部署 API Router..."
wrangler publish --config wrangler-api.toml

echo "✅ Workers 已部署"

echo "🎨 步驟 5: 建置前端"
echo "==================="

# 回到根目錄
cd ..

# 安裝前端依賴
echo "安裝前端依賴..."
npm install --workspace=frontend

# 建置前端
echo "建置前端..."
npm run build --workspace=frontend

echo "✅ 前端已建置"

echo "🎉 部署完成！"
echo "============"
echo ""
echo "📋 設置摘要："
echo "• D1 資料庫 ID: $DB_ID"
echo "• KV 命名空間 ID: $KV_ID"
echo "• 帳戶 ID: 5efa272dc28e4e3933324c44165b6dbe (Neo-Cloudflare)"
echo ""
echo "🔧 接下來的步驟："
echo "1. 在 Cloudflare Dashboard 中建立 AI Gateway"
echo "2. 更新 wrangler-*.toml 文件中的 API 金鑰"
echo "3. 重新部署 Workers:"
echo "   cd workers"
echo "   wrangler publish --config wrangler-api.toml"
echo "   wrangler publish --config wrangler-consumer.toml"
echo ""
echo "💡 開發環境："
echo "• 前端: npm run dev"
echo "• Workers: npm run dev:workers"
echo ""
echo "📚 查看 README.md 獲取更多詳細信息"
echo ""
echo "🌟 祝您使用愉快！" 