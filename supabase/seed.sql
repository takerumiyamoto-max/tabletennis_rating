-- ============================================================
-- シードデータ (開発・テスト用)
-- 実際のauth.usersはSupabase Authで作成するため、このファイルはダミーデータ
-- ============================================================

-- グループ作成後に管理者コンソールから以下を実行してください:

-- 1. テストユーザーを auth.users に登録 (Supabase Auth UI または CLI で)

-- 2. グループ作成例
-- INSERT INTO groups (name, slug, description, created_by)
-- VALUES ('○○大学卓球部', 'xxxxuniv-tt', '○○大学卓球部のレーティング管理', '<user_id>');

-- 3. デフォルト初期レートラベル (グループ作成後に挿入)
-- INSERT INTO initial_rating_labels (group_id, label, description, initial_rating, sort_order) VALUES
--   ('<group_id>', '未経験・初心者', 'ラケットを初めて握る方', 1000, 1),
--   ('<group_id>', '大学始め',       '大学で卓球を始めた方',   1150, 2),
--   ('<group_id>', '中学経験者',     '中学で部活経験がある方', 1300, 3),
--   ('<group_id>', '高校経験者',     '高校で部活経験がある方', 1450, 4),
--   ('<group_id>', '大会経験者',     '各種大会に出場経験がある方', 1600, 5),
--   ('<group_id>', '上級者',         '全国・県上位レベル',     1750, 6);

-- 4. デフォルトレート設定
-- INSERT INTO group_rating_settings (group_id) VALUES ('<group_id>');
-- (全てデフォルト値で作成される)
