-- 資料庫升級腳本 - 支援 Dynamic Routing 用戶分級系統
-- 執行日期: 2025-09-05

-- 1. 在 users 表新增 user_tier 欄位
ALTER TABLE users ADD COLUMN user_tier TEXT DEFAULT 'regular' CHECK(user_tier IN ('regular', 'vip'));

-- 2. 建立用戶使用統計表
CREATE TABLE IF NOT EXISTS user_usage_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    model_used TEXT NOT NULL,
    request_count INTEGER DEFAULT 0,
    total_cost_usd DECIMAL(10,4) DEFAULT 0.0000,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, date, model_used)
);

-- 3. 建立聊天記錄表 (用於儲存 metadata)
CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at DATETIME NOT NULL,
    r2_key TEXT,
    metadata JSON,
    cost_usd DECIMAL(10,4) DEFAULT 0.0000
);

-- 4. 建立用戶配額表 (用於 Dynamic Routing 限制)
CREATE TABLE IF NOT EXISTS user_quotas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    quota_type TEXT NOT NULL CHECK(quota_type IN ('daily_requests', 'monthly_cost', 'concurrent_requests')),
    limit_value INTEGER NOT NULL,
    current_usage INTEGER DEFAULT 0,
    reset_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, quota_type)
);

-- 5. 設定現有用戶為 regular 等級
UPDATE users SET user_tier = 'regular' WHERE user_tier IS NULL;

-- 6. 為現有用戶設定預設配額
INSERT OR REPLACE INTO user_quotas (user_id, quota_type, limit_value, reset_date) 
SELECT 
    id,
    'daily_requests',
    CASE 
        WHEN user_tier = 'vip' THEN 1000
        ELSE 100
    END,
    DATE('now', '+1 day')
FROM users;

INSERT OR REPLACE INTO user_quotas (user_id, quota_type, limit_value, reset_date) 
SELECT 
    id,
    'monthly_cost',
    CASE 
        WHEN user_tier = 'vip' THEN 100
        ELSE 10
    END,
    DATE('now', 'start of month', '+1 month')
FROM users;

-- 7. 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_user_date ON user_usage_stats(user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_usage_stats_model ON user_usage_stats(model_used);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_type ON user_quotas(user_id, quota_type);
