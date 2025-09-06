-- 新增 VIP 用戶腳本
-- 執行日期: 2025-09-05

-- 為新用戶生成密碼 hash (使用用戶名作為預設密碼)
-- kevin -> SHA-256 hash
-- vera -> SHA-256 hash  
-- ian -> SHA-256 hash

-- 1. 新增 kevin (密碼: kevin)
-- SHA-256("kevin") = "85f5e10431f69bc2a14046a13aabaefc660103b6de7a84f75c4b96181d03f0b5"
INSERT INTO users (username, password_hash, email, user_tier) 
VALUES ('kevin', '85f5e10431f69bc2a14046a13aabaefc660103b6de7a84f75c4b96181d03f0b5', 'menghsien@cloudflare.com', 'vip');

-- 2. 新增 vera (密碼: vera)
-- SHA-256("vera") = "c7f6d322bc205f26de153999e8d923b63b9261ce34bcb0ef1b9c711f843e05d5"
INSERT INTO users (username, password_hash, email, user_tier) 
VALUES ('vera', 'c7f6d322bc205f26de153999e8d923b63b9261ce34bcb0ef1b9c711f843e05d5', 'vera@cloudflare.com', 'vip');

-- 3. 新增 ian (密碼: ian)
-- SHA-256("ian") = "b54a95127a4b573f41e335fdbd339dcc2208fbfb1ae0b6fab7599d6e2d6ec754"
INSERT INTO users (username, password_hash, email, user_tier) 
VALUES ('ian', 'b54a95127a4b573f41e335fdbd339dcc2208fbfb1ae0b6fab7599d6e2d6ec754', 'ianchen@cloudflare.com', 'vip');

-- 4. 為新的 VIP 用戶設定配額
-- 獲取新增用戶的 ID 並設定 VIP 配額 (每日 1000 requests, 每月 $100)

-- Kevin 的配額
INSERT INTO user_quotas (user_id, quota_type, limit_value, reset_date) 
SELECT id, 'daily_requests', 1000, DATE('now', '+1 day')
FROM users WHERE username = 'kevin';

INSERT INTO user_quotas (user_id, quota_type, limit_value, reset_date) 
SELECT id, 'monthly_cost', 100, DATE('now', 'start of month', '+1 month')
FROM users WHERE username = 'kevin';

-- Vera 的配額
INSERT INTO user_quotas (user_id, quota_type, limit_value, reset_date) 
SELECT id, 'daily_requests', 1000, DATE('now', '+1 day')
FROM users WHERE username = 'vera';

INSERT INTO user_quotas (user_id, quota_type, limit_value, reset_date) 
SELECT id, 'monthly_cost', 100, DATE('now', 'start of month', '+1 month')
FROM users WHERE username = 'vera';

-- Ian 的配額
INSERT INTO user_quotas (user_id, quota_type, limit_value, reset_date) 
SELECT id, 'daily_requests', 1000, DATE('now', '+1 day')
FROM users WHERE username = 'ian';

INSERT INTO user_quotas (user_id, quota_type, limit_value, reset_date) 
SELECT id, 'monthly_cost', 100, DATE('now', 'start of month', '+1 month')
FROM users WHERE username = 'ian';
