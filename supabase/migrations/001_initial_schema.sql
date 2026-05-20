-- ============================================================
-- 卓球レーティング管理アプリ — 初期スキーマ
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- EXTENSIONS
-- ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- ENUMS
-- ────────────────────────────────────────────────────────────
CREATE TYPE member_role   AS ENUM ('owner', 'admin', 'member');
CREATE TYPE member_status AS ENUM ('active', 'invited', 'suspended');
CREATE TYPE match_status  AS ENUM ('pending', 'approved', 'rejected', 'cancelled', 'corrected');
CREATE TYPE match_format  AS ENUM ('best_of_3', 'best_of_5');
CREATE TYPE match_result  AS ENUM ('win', 'loss');

-- ────────────────────────────────────────────────────────────
-- profiles
-- ────────────────────────────────────────────────────────────
CREATE TABLE profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname   TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ────────────────────────────────────────────────────────────
-- groups
-- ────────────────────────────────────────────────────────────
CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  icon_url    TEXT,
  created_by  UUID NOT NULL REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- group_members
-- ────────────────────────────────────────────────────────────
CREATE TABLE group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       member_role   NOT NULL DEFAULT 'member',
  status     member_status NOT NULL DEFAULT 'active',
  joined_at  TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ────────────────────────────────────────────────────────────
-- group_rating_settings
-- ────────────────────────────────────────────────────────────
CREATE TABLE group_rating_settings (
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id                        UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE UNIQUE,
  elo_scale                       INTEGER        NOT NULL DEFAULT 400,
  k_new                           INTEGER        NOT NULL DEFAULT 48,
  k_normal                        INTEGER        NOT NULL DEFAULT 32,
  k_stable                        INTEGER        NOT NULL DEFAULT 24,
  new_until_matches               INTEGER        NOT NULL DEFAULT 10,
  stable_from_matches             INTEGER        NOT NULL DEFAULT 30,
  best_of_3_straight_multiplier   NUMERIC(4,2)   NOT NULL DEFAULT 1.15,
  best_of_3_full_multiplier       NUMERIC(4,2)   NOT NULL DEFAULT 1.00,
  best_of_5_straight_multiplier   NUMERIC(4,2)   NOT NULL DEFAULT 1.25,
  best_of_5_four_game_multiplier  NUMERIC(4,2)   NOT NULL DEFAULT 1.10,
  best_of_5_full_multiplier       NUMERIC(4,2)   NOT NULL DEFAULT 1.00,
  created_at                      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- initial_rating_labels
-- ────────────────────────────────────────────────────────────
CREATE TABLE initial_rating_labels (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id       UUID    NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  label          TEXT    NOT NULL,
  description    TEXT,
  initial_rating INTEGER NOT NULL,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- player_ratings
-- ────────────────────────────────────────────────────────────
CREATE TABLE player_ratings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id                UUID         NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id                 UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating                  NUMERIC(10,4) NOT NULL,
  initial_rating          INTEGER       NOT NULL,
  initial_rating_label_id UUID         REFERENCES initial_rating_labels(id) ON DELETE SET NULL,
  approved_match_count    INTEGER       NOT NULL DEFAULT 0,
  wins                    INTEGER       NOT NULL DEFAULT 0,
  losses                  INTEGER       NOT NULL DEFAULT 0,
  current_streak          INTEGER       NOT NULL DEFAULT 0,
  highest_rating          NUMERIC(10,4) NOT NULL,
  lowest_rating           NUMERIC(10,4) NOT NULL,
  is_provisional          BOOLEAN       NOT NULL GENERATED ALWAYS AS (approved_match_count < 10) STORED,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- ────────────────────────────────────────────────────────────
-- matches
-- ────────────────────────────────────────────────────────────
CREATE TABLE matches (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID         NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  submitted_by UUID         NOT NULL REFERENCES auth.users(id),
  player_a_id  UUID         NOT NULL REFERENCES auth.users(id),
  player_b_id  UUID         NOT NULL REFERENCES auth.users(id),
  winner_id    UUID         NOT NULL REFERENCES auth.users(id),
  match_format match_format NOT NULL,
  player_a_sets INTEGER     NOT NULL CHECK (player_a_sets >= 0),
  player_b_sets INTEGER     NOT NULL CHECK (player_b_sets >= 0),
  status       match_status NOT NULL DEFAULT 'pending',
  approved_by  UUID         REFERENCES auth.users(id),
  approved_at  TIMESTAMPTZ,
  rejected_by  UUID         REFERENCES auth.users(id),
  rejected_at  TIMESTAMPTZ,
  cancelled_by UUID         REFERENCES auth.users(id),
  cancelled_at TIMESTAMPTZ,
  note         TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  -- セットカウント整合性チェック
  CONSTRAINT valid_sets CHECK (
    (match_format = 'best_of_3' AND (
      (player_a_sets = 2 AND player_b_sets IN (0,1)) OR
      (player_b_sets = 2 AND player_a_sets IN (0,1))
    )) OR
    (match_format = 'best_of_5' AND (
      (player_a_sets = 3 AND player_b_sets IN (0,1,2)) OR
      (player_b_sets = 3 AND player_a_sets IN (0,1,2))
    ))
  ),
  -- winner は player_a または player_b
  CONSTRAINT valid_winner CHECK (
    winner_id = player_a_id OR winner_id = player_b_id
  ),
  -- player_a と player_b は別人
  CONSTRAINT different_players CHECK (player_a_id != player_b_id)
);

-- ────────────────────────────────────────────────────────────
-- rating_histories
-- ────────────────────────────────────────────────────────────
CREATE TABLE rating_histories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      UUID         NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  match_id      UUID         NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  user_id       UUID         NOT NULL REFERENCES auth.users(id),
  opponent_id   UUID         NOT NULL REFERENCES auth.users(id),
  rating_before NUMERIC(10,4) NOT NULL,
  rating_after  NUMERIC(10,4) NOT NULL,
  rating_change NUMERIC(10,4) NOT NULL,
  result        match_result NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- notifications
-- ────────────────────────────────────────────────────────────
CREATE TABLE notifications (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id         UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             TEXT NOT NULL,
  title            TEXT NOT NULL,
  body             TEXT,
  related_match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────
CREATE INDEX idx_group_members_group_id  ON group_members(group_id);
CREATE INDEX idx_group_members_user_id   ON group_members(user_id);
CREATE INDEX idx_player_ratings_group_id ON player_ratings(group_id);
CREATE INDEX idx_player_ratings_user_id  ON player_ratings(user_id);
CREATE INDEX idx_player_ratings_rating   ON player_ratings(group_id, rating DESC);
CREATE INDEX idx_matches_group_id        ON matches(group_id);
CREATE INDEX idx_matches_player_a        ON matches(player_a_id);
CREATE INDEX idx_matches_player_b        ON matches(player_b_id);
CREATE INDEX idx_matches_status          ON matches(status);
CREATE INDEX idx_rating_histories_user   ON rating_histories(user_id);
CREATE INDEX idx_rating_histories_match  ON rating_histories(match_id);
CREATE INDEX idx_notifications_user      ON notifications(user_id);
CREATE INDEX idx_notifications_unread    ON notifications(user_id, read_at) WHERE read_at IS NULL;

-- ────────────────────────────────────────────────────────────
-- RLS ヘルパー関数 (再帰を避けるため SECURITY DEFINER)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION is_group_member(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid() AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION is_group_admin(p_group_id UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = p_group_id AND user_id = auth.uid()
      AND role IN ('owner', 'admin') AND status = 'active'
  );
$$;

-- ────────────────────────────────────────────────────────────
-- updated_at 自動更新トリガー
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_groups_updated_at
  BEFORE UPDATE ON groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_group_members_updated_at
  BEFORE UPDATE ON group_members
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_group_rating_settings_updated_at
  BEFORE UPDATE ON group_rating_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_initial_rating_labels_updated_at
  BEFORE UPDATE ON initial_rating_labels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_player_ratings_updated_at
  BEFORE UPDATE ON player_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_matches_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- profiles: グループメンバーは他メンバーのプロフィールも参照可
CREATE POLICY "profiles_select_group_member" ON profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members gm1
    JOIN group_members gm2 ON gm1.group_id = gm2.group_id
    WHERE gm1.user_id = auth.uid()
      AND gm2.user_id = profiles.user_id
      AND gm1.status = 'active'
      AND gm2.status = 'active'
  )
);

-- groups
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "groups_select_member" ON groups FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = groups.id AND user_id = auth.uid() AND status = 'active'
  )
);
CREATE POLICY "groups_insert_auth" ON groups FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "groups_update_admin" ON groups FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = groups.id AND user_id = auth.uid()
      AND role IN ('owner', 'admin') AND status = 'active'
  )
);

-- group_members
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "group_members_select" ON group_members FOR SELECT USING (
  user_id = auth.uid() OR is_group_member(group_id)
);
CREATE POLICY "group_members_insert_self" ON group_members FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "group_members_update_admin" ON group_members FOR UPDATE USING (
  user_id = auth.uid() OR is_group_admin(group_id)
);

-- group_rating_settings
ALTER TABLE group_rating_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "grs_select_member" ON group_rating_settings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = group_rating_settings.group_id AND user_id = auth.uid() AND status = 'active'
  )
);
CREATE POLICY "grs_manage_admin" ON group_rating_settings FOR ALL USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = group_rating_settings.group_id AND user_id = auth.uid()
      AND role IN ('owner', 'admin') AND status = 'active'
  )
);

-- initial_rating_labels
ALTER TABLE initial_rating_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "irl_select_member" ON initial_rating_labels FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = initial_rating_labels.group_id AND user_id = auth.uid() AND status = 'active'
  )
);
CREATE POLICY "irl_manage_admin" ON initial_rating_labels FOR ALL USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = initial_rating_labels.group_id AND user_id = auth.uid()
      AND role IN ('owner', 'admin') AND status = 'active'
  )
);

-- player_ratings
ALTER TABLE player_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pr_select_member" ON player_ratings FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = player_ratings.group_id AND user_id = auth.uid() AND status = 'active'
  )
);
CREATE POLICY "pr_insert_self" ON player_ratings FOR INSERT WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = player_ratings.group_id AND user_id = auth.uid() AND status = 'active'
  )
);
CREATE POLICY "pr_update_self_or_admin" ON player_ratings FOR UPDATE USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = player_ratings.group_id AND user_id = auth.uid()
      AND role IN ('owner', 'admin') AND status = 'active'
  )
);

-- matches
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_select_member" ON matches FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = matches.group_id AND user_id = auth.uid() AND status = 'active'
  )
);
CREATE POLICY "matches_insert_member" ON matches FOR INSERT WITH CHECK (
  submitted_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = matches.group_id AND user_id = auth.uid() AND status = 'active'
  )
);
CREATE POLICY "matches_update_player_or_admin" ON matches FOR UPDATE USING (
  player_a_id = auth.uid() OR player_b_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = matches.group_id AND user_id = auth.uid()
      AND role IN ('owner', 'admin') AND status = 'active'
  )
);

-- rating_histories
ALTER TABLE rating_histories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rh_select_member" ON rating_histories FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = rating_histories.group_id AND user_id = auth.uid() AND status = 'active'
  )
);
CREATE POLICY "rh_insert_system" ON rating_histories FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = rating_histories.group_id AND user_id = auth.uid() AND status = 'active'
  )
);

-- notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select_own"  ON notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_update_own"  ON notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "notif_insert_auth" ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
