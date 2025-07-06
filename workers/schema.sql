-- 創建用戶表格
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- 創建登錄日誌表格
CREATE TABLE IF NOT EXISTS login_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    login_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    success BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 插入初始用戶（用戶名：neo，密碼：neo）
-- 使用 SHA-256 hash "neo" = "73ef176d9f12809e64363b2b5f4553abecca7aae157327f190323cfa0e42c815"
INSERT OR REPLACE INTO users (username, password_hash, email) 
VALUES ('neo', '73ef176d9f12809e64363b2b5f4553abecca7aae157327f190323cfa0e42c815', 'neo@cloudflare.com'); 