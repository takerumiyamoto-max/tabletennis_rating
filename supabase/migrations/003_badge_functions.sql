-- =============================================================
-- Step 7: award_match_badges 関数
-- Step 8: approve_match_with_ratings（バッジ組み込み版）完全置き換え
-- Supabase SQL Editor に貼って実行可能（再実行OK）
-- =============================================================

-- ──────────────────────────────────────────────────────────────
-- 7. award_match_badges
-- ──────────────────────────────────────────────────────────────
create or replace function award_match_badges(
  p_group_id            uuid,
  p_user_id             uuid,
  p_match_id            uuid,
  p_result              text,        -- 'win' | 'loss'
  p_rating_before       numeric,
  p_rating_after        numeric,
  p_wins                int,         -- 更新後の wins
  p_match_count         int,         -- 更新後の approved_match_count
  p_current_streak      int,         -- 更新後の current_streak
  p_old_streak          int,         -- 更新前の current_streak
  p_sets_won            int,         -- 自分のセット数
  p_sets_lost           int,         -- 相手のセット数
  p_opponent_rating     numeric,     -- 相手の更新前レート
  p_opponent_old_streak int,         -- 相手の更新前 current_streak
  p_was_personal_best   boolean      -- 今回が自己最高レート更新か
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_badge_id          uuid;
  v_cond_val          int;
  v_rating_change     numeric := p_rating_after - p_rating_before;
  v_is_straight_win   boolean := (p_result = 'win' and p_sets_lost = 0);
  -- フルセット判定: 3-2 / 2-3 / 2-1 / 1-2
  v_is_full_set_match boolean := (
    (p_sets_won = 3 and p_sets_lost = 2) or
    (p_sets_lost = 3 and p_sets_won = 2) or
    (p_sets_won = 2 and p_sets_lost = 1) or
    (p_sets_lost = 2 and p_sets_won = 1)
  );
begin

  -- ===== match_count マイルストーン =====
  for v_badge_id in
    select id from badge_definitions
    where condition_type = 'match_count'
      and condition_value = p_match_count
      and is_active
  loop
    insert into player_badges(group_id, user_id, badge_id, related_match_id)
    values(p_group_id, p_user_id, v_badge_id, p_match_id)
    on conflict (group_id, user_id, badge_id) do nothing;
  end loop;

  -- ===== 認定戦完了（provisional_completed） =====
  -- approved_match_count が 10 になった瞬間（9→10 の遷移）
  if p_match_count = 10 then
    for v_badge_id in
      select id from badge_definitions
      where condition_type = 'provisional_completed' and is_active
    loop
      insert into player_badges(group_id, user_id, badge_id, related_match_id)
      values(p_group_id, p_user_id, v_badge_id, p_match_id)
      on conflict (group_id, user_id, badge_id) do nothing;
    end loop;
  end if;

  -- ===== win_count マイルストーン =====
  if p_result = 'win' then
    for v_badge_id in
      select id from badge_definitions
      where condition_type = 'win_count'
        and condition_value = p_wins
        and is_active
    loop
      insert into player_badges(group_id, user_id, badge_id, related_match_id)
      values(p_group_id, p_user_id, v_badge_id, p_match_id)
      on conflict (group_id, user_id, badge_id) do nothing;
    end loop;
  end if;

  -- ===== 連勝 =====
  if p_current_streak > 0 then
    for v_badge_id in
      select id from badge_definitions
      where condition_type = 'win_streak'
        and condition_value = p_current_streak
        and is_active
    loop
      insert into player_badges(group_id, user_id, badge_id, related_match_id)
      values(p_group_id, p_user_id, v_badge_id, p_match_id)
      on conflict (group_id, user_id, badge_id) do nothing;
    end loop;
  end if;

  -- ===== レート到達（前後でまたいだ閾値をすべて付与） =====
  for v_badge_id in
    select id from badge_definitions
    where condition_type = 'rating_reached'
      and condition_value >  p_rating_before
      and condition_value <= p_rating_after
      and is_active
  loop
    insert into player_badges(group_id, user_id, badge_id, related_match_id)
    values(p_group_id, p_user_id, v_badge_id, p_match_id)
    on conflict (group_id, user_id, badge_id) do nothing;
  end loop;

  -- ===== 自己ベスト更新（2試合目以降のみ） =====
  if p_was_personal_best and p_match_count >= 2 then
    for v_badge_id in
      select id from badge_definitions
      where condition_type = 'personal_best_rating' and is_active
    loop
      insert into player_badges(group_id, user_id, badge_id, related_match_id)
      values(p_group_id, p_user_id, v_badge_id, p_match_id)
      on conflict (group_id, user_id, badge_id) do nothing;
    end loop;
  end if;

  -- ===== 一撃大幅UP（condition_value = 閾値） =====
  for v_badge_id in
    select id from badge_definitions
    where condition_type = 'rating_gain_single'
      and coalesce(condition_value, 30) <= v_rating_change
      and is_active
  loop
    insert into player_badges(group_id, user_id, badge_id, related_match_id)
    values(p_group_id, p_user_id, v_badge_id, p_match_id)
    on conflict (group_id, user_id, badge_id) do nothing;
  end loop;

  -- ===== 完封勝利 =====
  if v_is_straight_win then
    for v_badge_id in
      select id from badge_definitions
      where condition_type = 'straight_win' and is_active
    loop
      insert into player_badges(group_id, user_id, badge_id, related_match_id)
      values(p_group_id, p_user_id, v_badge_id, p_match_id)
      on conflict (group_id, user_id, badge_id) do nothing;
    end loop;
  end if;

  -- ===== フルセット勝利 =====
  if p_result = 'win' and v_is_full_set_match then
    for v_badge_id in
      select id from badge_definitions
      where condition_type = 'full_set_win' and is_active
    loop
      insert into player_badges(group_id, user_id, badge_id, related_match_id)
      values(p_group_id, p_user_id, v_badge_id, p_match_id)
      on conflict (group_id, user_id, badge_id) do nothing;
    end loop;
  end if;

  -- ===== 格上撃破（condition_value = レート差閾値、default 100） =====
  if p_result = 'win' then
    for v_badge_id, v_cond_val in
      select id, coalesce(condition_value, 100)
      from badge_definitions
      where condition_type = 'beat_higher_rated' and is_active
    loop
      if p_opponent_rating >= p_rating_before + v_cond_val then
        insert into player_badges(group_id, user_id, badge_id, related_match_id)
        values(p_group_id, p_user_id, v_badge_id, p_match_id)
        on conflict (group_id, user_id, badge_id) do nothing;
      end if;
    end loop;
  end if;

  -- ===== フルセット格上撃破（condition_value = レート差閾値、default 100） =====
  if p_result = 'win' and v_is_full_set_match then
    for v_badge_id, v_cond_val in
      select id, coalesce(condition_value, 100)
      from badge_definitions
      where condition_type = 'full_set_upset_win' and is_active
    loop
      if p_opponent_rating >= p_rating_before + v_cond_val then
        insert into player_badges(group_id, user_id, badge_id, related_match_id)
        values(p_group_id, p_user_id, v_badge_id, p_match_id)
        on conflict (group_id, user_id, badge_id) do nothing;
      end if;
    end loop;
  end if;

  -- ===== 完封格上撃破（condition_value = レート差閾値、default 200） =====
  if v_is_straight_win then
    for v_badge_id, v_cond_val in
      select id, coalesce(condition_value, 200)
      from badge_definitions
      where condition_type = 'perfect_upset_win' and is_active
    loop
      if p_opponent_rating >= p_rating_before + v_cond_val then
        insert into player_badges(group_id, user_id, badge_id, related_match_id)
        values(p_group_id, p_user_id, v_badge_id, p_match_id)
        on conflict (group_id, user_id, badge_id) do nothing;
      end if;
    end loop;
  end if;

  -- ===== 連敗後の反撃（2連敗以上の後に勝利） =====
  if p_result = 'win' and p_old_streak <= -2 then
    for v_badge_id in
      select id from badge_definitions
      where condition_type = 'comeback_after_losses' and is_active
    loop
      insert into player_badges(group_id, user_id, badge_id, related_match_id)
      values(p_group_id, p_user_id, v_badge_id, p_match_id)
      on conflict (group_id, user_id, badge_id) do nothing;
    end loop;
  end if;

  -- ===== 連勝ストッパー（相手が3連勝以上していたのを止めた） =====
  if p_result = 'win' and p_opponent_old_streak >= 3 then
    for v_badge_id in
      select id from badge_definitions
      where condition_type = 'break_opponent_streak' and is_active
    loop
      insert into player_badges(group_id, user_id, badge_id, related_match_id)
      values(p_group_id, p_user_id, v_badge_id, p_match_id)
      on conflict (group_id, user_id, badge_id) do nothing;
    end loop;
  end if;

end;
$$;

-- ──────────────────────────────────────────────────────────────
-- 8. approve_match_with_ratings（バッジ組み込み完全版）
-- 既存関数を DROP して新しいシグネチャで再作成
-- ──────────────────────────────────────────────────────────────
drop function if exists approve_match_with_ratings(uuid, numeric, public.match_result, numeric, public.match_result);
drop function if exists approve_match_with_ratings(uuid, numeric, text, numeric, text);

create function approve_match_with_ratings(
  p_match_id        uuid,
  p_a_rating_after  numeric,
  p_a_result        text,
  p_b_rating_after  numeric,
  p_b_result        text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_caller            uuid;
  v_match             record;
  v_rating_a          record;
  v_rating_b          record;
  v_a_change          numeric;
  v_b_change          numeric;
  v_rows_match        int;
  v_rows_ra           int;
  v_rows_rb           int;
  -- バッジ付与用
  v_a_was_pb          boolean;
  v_b_was_pb          boolean;
  v_a_new_streak      int;
  v_b_new_streak      int;
  v_a_new_match_count int;
  v_b_new_match_count int;
  v_a_new_wins        int;
  v_b_new_wins        int;
begin
  -- ── 認証確認 ──
  v_caller := auth.uid();
  if v_caller is null then
    raise exception 'auth.uid() is null — not authenticated';
  end if;

  -- ── 試合取得 ──
  select * into v_match from matches where id = p_match_id;
  if not found then
    raise exception 'match not found: %', p_match_id;
  end if;
  if v_match.status::text != 'pending' then
    raise exception 'match is not pending (status=%, id=%)', v_match.status, p_match_id;
  end if;

  -- ── 権限確認（player_b 本人 or admin/owner） ──
  if v_caller != v_match.player_b_id then
    if not exists (
      select 1 from group_members
      where group_id = v_match.group_id
        and user_id  = v_caller
        and status   = 'active'
        and role in ('owner', 'admin')
    ) then
      raise exception 'unauthorized: caller=% is not player_b or admin', v_caller;
    end if;
  end if;

  -- ── レート取得（更新前の値として使う） ──
  select rating, approved_match_count, wins, losses, current_streak, highest_rating
  into v_rating_a
  from player_ratings
  where group_id = v_match.group_id and user_id = v_match.player_a_id;
  if not found then
    raise exception 'player_ratings not found for player_a=%', v_match.player_a_id;
  end if;

  select rating, approved_match_count, wins, losses, current_streak, highest_rating
  into v_rating_b
  from player_ratings
  where group_id = v_match.group_id and user_id = v_match.player_b_id;
  if not found then
    raise exception 'player_ratings not found for player_b=%', v_match.player_b_id;
  end if;

  -- ── バッジ用の事前計算（player_ratings 更新前に行う） ──
  v_a_was_pb          := p_a_rating_after > v_rating_a.highest_rating;
  v_b_was_pb          := p_b_rating_after > v_rating_b.highest_rating;

  v_a_new_streak      := case when p_a_result = 'win'
                            then greatest(v_rating_a.current_streak, 0) + 1
                            else least(v_rating_a.current_streak, 0) - 1 end;
  v_b_new_streak      := case when p_b_result = 'win'
                            then greatest(v_rating_b.current_streak, 0) + 1
                            else least(v_rating_b.current_streak, 0) - 1 end;

  v_a_new_match_count := v_rating_a.approved_match_count + 1;
  v_b_new_match_count := v_rating_b.approved_match_count + 1;
  v_a_new_wins        := v_rating_a.wins + case when p_a_result = 'win' then 1 else 0 end;
  v_b_new_wins        := v_rating_b.wins + case when p_b_result = 'win' then 1 else 0 end;

  v_a_change := p_a_rating_after - v_rating_a.rating;
  v_b_change := p_b_rating_after - v_rating_b.rating;

  -- ── matches ステータス更新 ──
  update matches
  set status      = 'approved',
      approved_at = now(),
      approved_by = v_caller
  where id = p_match_id;
  get diagnostics v_rows_match = row_count;
  if v_rows_match = 0 then
    raise exception 'matches update affected 0 rows for id=%', p_match_id;
  end if;

  -- ── rating_histories 追加 ──
  insert into rating_histories
    (match_id, group_id, user_id, opponent_id, result, rating_before, rating_after, rating_change)
  values
    (p_match_id, v_match.group_id, v_match.player_a_id, v_match.player_b_id,
     p_a_result::match_result, v_rating_a.rating, p_a_rating_after, v_a_change),
    (p_match_id, v_match.group_id, v_match.player_b_id, v_match.player_a_id,
     p_b_result::match_result, v_rating_b.rating, p_b_rating_after, v_b_change);

  -- ── player_ratings 更新（player A） ──
  update player_ratings
  set rating               = p_a_rating_after,
      approved_match_count = v_rating_a.approved_match_count + 1,
      wins                 = v_rating_a.wins   + case when p_a_result = 'win'  then 1 else 0 end,
      losses               = v_rating_a.losses + case when p_a_result = 'loss' then 1 else 0 end,
      current_streak       = v_a_new_streak,
      highest_rating       = greatest(highest_rating, p_a_rating_after),
      lowest_rating        = least(lowest_rating, p_a_rating_after),
      updated_at           = now()
  where group_id = v_match.group_id and user_id = v_match.player_a_id;
  get diagnostics v_rows_ra = row_count;

  -- ── player_ratings 更新（player B） ──
  update player_ratings
  set rating               = p_b_rating_after,
      approved_match_count = v_rating_b.approved_match_count + 1,
      wins                 = v_rating_b.wins   + case when p_b_result = 'win'  then 1 else 0 end,
      losses               = v_rating_b.losses + case when p_b_result = 'loss' then 1 else 0 end,
      current_streak       = v_b_new_streak,
      highest_rating       = greatest(highest_rating, p_b_rating_after),
      lowest_rating        = least(lowest_rating, p_b_rating_after),
      updated_at           = now()
  where group_id = v_match.group_id and user_id = v_match.player_b_id;
  get diagnostics v_rows_rb = row_count;

  -- ── バッジ付与（失敗しても承認全体をロールバックしない） ──
  begin
    perform award_match_badges(
      v_match.group_id, v_match.player_a_id, p_match_id,
      p_a_result,
      v_rating_a.rating,  p_a_rating_after,
      v_a_new_wins,       v_a_new_match_count,
      v_a_new_streak,     v_rating_a.current_streak,
      v_match.player_a_sets, v_match.player_b_sets,
      v_rating_b.rating,  v_rating_b.current_streak,
      v_a_was_pb
    );
    perform award_match_badges(
      v_match.group_id, v_match.player_b_id, p_match_id,
      p_b_result,
      v_rating_b.rating,  p_b_rating_after,
      v_b_new_wins,       v_b_new_match_count,
      v_b_new_streak,     v_rating_b.current_streak,
      v_match.player_b_sets, v_match.player_a_sets,
      v_rating_a.rating,  v_rating_a.current_streak,
      v_b_was_pb
    );
  exception when others then
    raise warning 'award_match_badges failed for match %: %', p_match_id, sqlerrm;
  end;

  -- ── 通知を既読に更新 ──
  update notifications
  set read_at = now()
  where read_at is null
    and (
      related_match_id = p_match_id
      or (
        group_id = v_match.group_id
        and user_id = v_match.player_b_id
        and type    = 'match_approval_request'
      )
    );

  return jsonb_build_object(
    'match_id',             p_match_id,
    'caller',               v_caller,
    'status',               'approved',
    'player_a_rating_after', p_a_rating_after,
    'player_b_rating_after', p_b_rating_after,
    'rows_match',            v_rows_match,
    'rows_rating_a',         v_rows_ra,
    'rows_rating_b',         v_rows_rb
  );
end;
$$;
