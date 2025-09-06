-- 修復 chats 表 - 添加缺失的欄位
-- 檢查並添加 model 欄位
ALTER TABLE chats ADD COLUMN model TEXT;

-- 檢查並添加 metadata 欄位
ALTER TABLE chats ADD COLUMN metadata JSON;

-- 檢查並添加 cost_usd 欄位
ALTER TABLE chats ADD COLUMN cost_usd DECIMAL(10,4) DEFAULT 0.0000;

-- 更新現有記錄的 model 欄位為預設值（如果為 NULL）
UPDATE chats SET model = 'unknown' WHERE model IS NULL;

-- 修改 created_at 欄位類型（如果需要）
-- 注意：SQLite 不支援直接修改欄位類型，但我們可以保持現有的 TEXT 類型
