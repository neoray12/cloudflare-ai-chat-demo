-- Cloudflare AI Chat Demo 資料庫架構
-- 建立時間: 2024-01-01

-- 聊天記錄元數據表
CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT,
    r2_key TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    model TEXT NOT NULL,
    message_count INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0
);

-- 索引優化查詢效能
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at);
CREATE INDEX IF NOT EXISTS idx_chats_status ON chats(status);
CREATE INDEX IF NOT EXISTS idx_chats_model ON chats(model);

-- 用戶表（可選，用於身份驗證）
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_login TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    plan TEXT DEFAULT 'free',
    usage_limit INTEGER DEFAULT 100
);

-- 用戶索引
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- API 金鑰表（用於 API 存取）
CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_used TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    rate_limit INTEGER DEFAULT 10,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- API 金鑰索引
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- 使用統計表
CREATE TABLE IF NOT EXISTS usage_stats (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    model TEXT NOT NULL,
    date TEXT NOT NULL,
    request_count INTEGER DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    cost_cents INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 使用統計索引
CREATE INDEX IF NOT EXISTS idx_usage_stats_user_id ON usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_stats_date ON usage_stats(date);
CREATE INDEX IF NOT EXISTS idx_usage_stats_model ON usage_stats(model);

-- 系統設定表
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TEXT NOT NULL,
    updated_by TEXT
);

-- 插入預設系統設定
INSERT OR IGNORE INTO system_settings (key, value, description, updated_at, updated_by) VALUES
('max_message_length', '4000', '最大訊息長度', datetime('now'), 'system'),
('cache_ttl_seconds', '3600', '快取存活時間（秒）', datetime('now'), 'system'),
('max_requests_per_minute', '10', '每分鐘最大請求數', datetime('now'), 'system'),
('ai_gateway_timeout', '30', 'AI Gateway 超時時間（秒）', datetime('now'), 'system'),
('default_model', 'worker-ai', '預設 AI 模型', datetime('now'), 'system');

-- 錯誤日誌表
CREATE TABLE IF NOT EXISTS error_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    request_id TEXT,
    created_at TEXT NOT NULL,
    resolved_at TEXT,
    severity TEXT DEFAULT 'error'
);

-- 錯誤日誌索引
CREATE INDEX IF NOT EXISTS idx_error_logs_user_id ON error_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at ON error_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_error_logs_error_type ON error_logs(error_type);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);

-- 效能監控表
CREATE TABLE IF NOT EXISTS performance_metrics (
    id TEXT PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    tags TEXT, -- JSON 格式的標籤
    timestamp TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- 效能監控索引
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp);

-- 建立觸發器來自動更新 updated_at 欄位
CREATE TRIGGER IF NOT EXISTS update_chats_updated_at
    AFTER UPDATE ON chats
    FOR EACH ROW
    BEGIN
        UPDATE chats SET updated_at = datetime('now') WHERE id = NEW.id;
    END;

-- 建立觸發器來自動更新使用統計
CREATE TRIGGER IF NOT EXISTS update_usage_stats_on_chat
    AFTER INSERT ON chats
    FOR EACH ROW
    BEGIN
        INSERT OR REPLACE INTO usage_stats (
            id, user_id, model, date, request_count, tokens_used, cost_cents, created_at
        ) VALUES (
            NEW.user_id || '_' || NEW.model || '_' || date(NEW.created_at),
            NEW.user_id,
            NEW.model,
            date(NEW.created_at),
            COALESCE((SELECT request_count FROM usage_stats WHERE id = NEW.user_id || '_' || NEW.model || '_' || date(NEW.created_at)), 0) + 1,
            COALESCE((SELECT tokens_used FROM usage_stats WHERE id = NEW.user_id || '_' || NEW.model || '_' || date(NEW.created_at)), 0) + COALESCE(NEW.tokens_used, 0),
            COALESCE((SELECT cost_cents FROM usage_stats WHERE id = NEW.user_id || '_' || NEW.model || '_' || date(NEW.created_at)), 0) + COALESCE(NEW.cost_cents, 0),
            COALESCE((SELECT created_at FROM usage_stats WHERE id = NEW.user_id || '_' || NEW.model || '_' || date(NEW.created_at)), NEW.created_at)
        );
    END; 