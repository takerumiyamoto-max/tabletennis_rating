-- =============================================================
-- Badge System Migration
-- Supabase SQL Editor に貼って実行可能（再実行OK）
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. badge_definitions テーブル
-- ──────────────────────────────────────────────────────────────
create table if not exists badge_definitions (
  id               uuid        primary key default gen_random_uuid(),
  code             text        unique not null,
  name             text        not null,
  description      text        not null,
  unlock_condition text        not null,
  icon             text,
  category         text        not null,
  rarity           text        not null check (rarity in ('common','uncommon','rare','epic','legendary')),
  condition_type   text        not null,
  condition_value  integer,
  title_reward     text,
  sort_order       integer     not null default 0,
  is_active        boolean     not null default true,
  created_at       timestamptz not null default now()
);

-- ──────────────────────────────────────────────────────────────
-- 2. player_badges テーブル
-- ──────────────────────────────────────────────────────────────
create table if not exists player_badges (
  id               uuid        primary key default gen_random_uuid(),
  group_id         uuid        not null references groups(id) on delete cascade,
  user_id          uuid        not null references auth.users(id) on delete cascade,
  badge_id         uuid        not null references badge_definitions(id) on delete cascade,
  related_match_id uuid        references matches(id) on delete set null,
  unlocked_at      timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  unique (group_id, user_id, badge_id)
);

create index if not exists idx_player_badges_group_user on player_badges(group_id, user_id);
create index if not exists idx_player_badges_badge      on player_badges(badge_id);

-- ──────────────────────────────────────────────────────────────
-- 3. RLS
-- ──────────────────────────────────────────────────────────────
alter table badge_definitions enable row level security;
alter table player_badges      enable row level security;

-- badge_definitions: 認証ユーザー全員が読み取り可
drop policy if exists "badge_definitions_select" on badge_definitions;
create policy "badge_definitions_select"
  on badge_definitions for select to authenticated
  using (true);

-- player_badges: 同じグループのアクティブメンバーのみ読み取り可
drop policy if exists "player_badges_select" on player_badges;
create policy "player_badges_select"
  on player_badges for select to authenticated
  using (
    exists (
      select 1 from group_members gm
      where gm.group_id = player_badges.group_id
        and gm.user_id  = auth.uid()
        and gm.status   = 'active'
    )
  );

-- ──────────────────────────────────────────────────────────────
-- 4. Seed: Phase A バッジ 30 個（is_active = true）
-- ──────────────────────────────────────────────────────────────
insert into badge_definitions
  (code, name, description, unlock_condition, icon, category, rarity, condition_type, condition_value, sort_order)
values
  -- 試合経験 (trial)
  ('first_match',   'はじめの一歩',   '初めての試合が承認された',             '1試合承認',       '👟', 'trial',   'common',    'match_count',           1,    10),
  ('match_5',       '5試合達成',       '承認済み試合が5試合に達した',           '5試合承認',       '🏓', 'trial',   'common',    'match_count',           5,    20),
  ('match_10',      '10試合達成',      '承認済み試合が10試合に達した',          '10試合承認',      '🎯', 'trial',   'common',    'match_count',           10,   30),
  ('certified',     '認定戦完了',      '仮レート期間を終えて正式レートへ移行',  '10試合で仮卒業',  '🏅', 'trial',   'uncommon',  'provisional_completed', null, 35),
  ('match_25',      '25試合達成',      '承認済み試合が25試合に達した',          '25試合承認',      '💪', 'trial',   'uncommon',  'match_count',           25,   40),
  ('match_50',      '50試合達成',      '承認済み試合が50試合に達した',          '50試合承認',      '🔥', 'trial',   'rare',      'match_count',           50,   50),
  ('match_100',     '100試合達成',     '承認済み試合が100試合に達した',         '100試合承認',     '💎', 'trial',   'epic',      'match_count',           100,  60),

  -- 勝利 (victory)
  ('first_win',     '初勝利',          '初めて勝利した',                        '初めての勝利',    '⭐', 'victory', 'common',    'win_count',             1,    110),
  ('win_10',        '10勝達成',        '通算10勝を達成した',                    '通算10勝',        '🥊', 'victory', 'uncommon',  'win_count',             10,   120),
  ('win_25',        '25勝達成',        '通算25勝を達成した',                    '通算25勝',        '🏆', 'victory', 'rare',      'win_count',             25,   130),
  ('win_50',        '50勝達成',        '通算50勝を達成した',                    '通算50勝',        '👑', 'victory', 'epic',      'win_count',             50,   140),
  ('win_100',       '100勝達成',       '通算100勝を達成した',                   '通算100勝',       '🌟', 'victory', 'legendary', 'win_count',             100,  150),

  -- 連勝 (streak)
  ('streak_3',      '3連勝',           '3試合連続で勝利した',                   '3連勝',           '⚡', 'streak',  'uncommon',  'win_streak',            3,    210),
  ('streak_5',      '5連勝',           '5試合連続で勝利した',                   '5連勝',           '🌪️','streak',  'rare',      'win_streak',            5,    220),
  ('streak_7',      '7連勝',           '7試合連続で勝利した',                   '7連勝',           '🔱', 'streak',  'epic',      'win_streak',            7,    230),
  ('streak_10',     '10連勝',          '10試合連続で勝利した',                  '10連勝',          '🌠', 'streak',  'legendary', 'win_streak',            10,   240),

  -- レート (rating)
  ('rating_1600',   'レート1600',      'レーティングが1600に到達した',          'レート1600到達',  '📈', 'rating',  'uncommon',  'rating_reached',        1600, 310),
  ('rating_1700',   'レート1700',      'レーティングが1700に到達した',          'レート1700到達',  '🚀', 'rating',  'rare',      'rating_reached',        1700, 320),
  ('rating_1800',   'レート1800',      'レーティングが1800に到達した',          'レート1800到達',  '💫', 'rating',  'rare',      'rating_reached',        1800, 330),
  ('rating_1900',   'レート1900',      'レーティングが1900に到達した',          'レート1900到達',  '🌙', 'rating',  'epic',      'rating_reached',        1900, 340),
  ('rating_2000',   'レート2000',      'レーティングが2000に到達した',          'レート2000到達',  '☀️', 'rating',  'legendary', 'rating_reached',        2000, 350),
  ('personal_best', '自己ベスト更新',  '2試合目以降で過去最高レートを更新した', '最高レート更新',  '📊', 'rating',  'common',    'personal_best_rating',  null, 360),
  ('big_gain',      '一撃大幅UP',      '1試合でレートが30以上上昇した',         '1試合+30以上',    '⬆️', 'rating',  'uncommon',  'rating_gain_single',    30,   370),

  -- 試合品質 (quality)
  ('straight_win',   '完封勝利',        '1セットも落とさず勝利した（3-0 or 2-0）', '3-0 or 2-0',       '💥', 'quality', 'common',    'straight_win',          null, 410),
  ('full_set_win',   'フルセット制勝',  'フルセットの末に勝利した（3-2 or 2-1）',  '3-2 or 2-1',       '⚔️', 'quality', 'uncommon',  'full_set_win',          null, 420),
  ('beat_higher',    '格上撃破',        '自分より100以上レートが高い相手に勝った', 'レート差+100以上', '🎯', 'quality', 'uncommon',  'beat_higher_rated',     100,  430),
  ('full_set_upset', 'フルセット格上撃破','フルセットの末に格上相手を倒した',      'フルセット+格上',  '🗡️','quality', 'rare',      'full_set_upset_win',    100,  440),
  ('perfect_upset',  '完封格上撃破',    '格上相手を1セットも与えず倒した',        'ストレート+格上',  '🎖️','quality', 'rare',      'perfect_upset_win',     200,  450),
  ('comeback',       '連敗後の反撃',    '2連敗以上のあとに勝利した',             '2連敗後の勝利',    '🔄', 'quality', 'uncommon',  'comeback_after_losses', null, 460),
  ('streak_breaker', '連勝ストッパー',  '相手の3連勝以上を止めた',               '相手3連勝を阻止',  '🛡️','quality', 'uncommon',  'break_opponent_streak', null, 470)

on conflict (code) do update set
  name             = excluded.name,
  description      = excluded.description,
  unlock_condition = excluded.unlock_condition,
  icon             = excluded.icon,
  category         = excluded.category,
  rarity           = excluded.rarity,
  condition_type   = excluded.condition_type,
  condition_value  = excluded.condition_value,
  sort_order       = excluded.sort_order;

-- ──────────────────────────────────────────────────────────────
-- 5. Seed: Phase B バッジ 11 個（is_active = false）
-- ──────────────────────────────────────────────────────────────
insert into badge_definitions
  (code, name, description, unlock_condition, icon, category, rarity, condition_type, condition_value, sort_order, is_active)
values
  ('win_rate_50',         '勝率50%超え',      '通算勝率が50%を超えた',              '勝率50%以上',   '📉', 'aggregate', 'common',    'win_rate_threshold',         50,  510, false),
  ('win_rate_60',         '勝率60%超え',      '通算勝率が60%を超えた',              '勝率60%以上',   '📊', 'aggregate', 'rare',      'win_rate_threshold',         60,  520, false),
  ('win_rate_70',         '勝率70%超え',      '通算勝率が70%を超えた',              '勝率70%以上',   '📈', 'aggregate', 'epic',      'win_rate_threshold',         70,  530, false),
  ('active_week',         '週5試合',          '1週間に5試合以上こなした',           '週5試合',       '🗓️','aggregate', 'common',    'weekly_match_count',          5,  540, false),
  ('active_month',        '月10試合',         '1ヶ月に10試合以上こなした',          '月10試合',      '📅', 'aggregate', 'uncommon',  'monthly_match_count',        10,  550, false),
  ('super_active',        '月20試合',         '1ヶ月に20試合以上こなした',          '月20試合',      '🔋', 'aggregate', 'rare',      'monthly_match_count',        20,  560, false),
  ('hot_week',            '週間レート+30',    '1週間でレートが30以上上昇した',      '週間+30',       '🌡️','aggregate', 'uncommon',  'weekly_rating_gain',         30,  570, false),
  ('hot_month',           '月間レート+50',    '1ヶ月でレートが50以上上昇した',      '月間+50',       '🌋', 'aggregate', 'rare',      'monthly_rating_gain',        50,  580, false),
  ('upset_master',        '格上撃破10回',     '格上撃破を合計10回達成した',         '格上撃破10回',  '🎯', 'aggregate', 'rare',      'beat_higher_rated_count',    10,  590, false),
  ('full_set_specialist', 'フルセット10勝',   'フルセット勝利を合計10回達成した',   'FS勝利10回',    '⚔️', 'aggregate', 'rare',      'full_set_win_count',         10,  600, false),
  ('consistent',          '3週連続プラス',    '3週連続でレートがプラスだった',      '3週連続+',      '📆', 'aggregate', 'epic',      'consecutive_positive_weeks',  3,  610, false)

on conflict (code) do update set
  name             = excluded.name,
  description      = excluded.description,
  unlock_condition = excluded.unlock_condition,
  icon             = excluded.icon,
  category         = excluded.category,
  rarity           = excluded.rarity,
  condition_type   = excluded.condition_type,
  condition_value  = excluded.condition_value,
  sort_order       = excluded.sort_order,
  is_active        = excluded.is_active;
