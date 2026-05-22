'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { calculateRatingUpdate, toRatingSettings } from '@/lib/rating/elo';

async function getAdminClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

async function checkAdminRole(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, groupId: string) {
  const { data } = await supabase
    .from('group_members').select('role')
    .eq('user_id', userId).eq('group_id', groupId).eq('status', 'active').single();
  return data?.role === 'owner' || data?.role === 'admin';
}

export async function adminApproveMatch(matchId: string): Promise<{ error?: string }> {
  const { supabase, user } = await getAdminClient();
  if (!user) return { error: '未認証' };

  const { data: match } = await supabase.from('matches').select('*').eq('id', matchId).single();
  if (!match) return { error: '試合が見つかりません' };
  if (match.status !== 'pending') return { error: 'この試合はすでに処理済みです' };

  const isAdmin = await checkAdminRole(supabase, user.id, match.group_id);
  if (!isAdmin) return { error: '権限がありません' };

  const [{ data: settings }, { data: ratingsRows }] = await Promise.all([
    supabase.from('group_rating_settings').select('*').eq('group_id', match.group_id).single(),
    supabase.from('player_ratings')
      .select('user_id, rating, approved_match_count')
      .eq('group_id', match.group_id)
      .in('user_id', [match.player_a_id, match.player_b_id]),
  ]);

  const ratingA = ratingsRows?.find(r => r.user_id === match.player_a_id);
  const ratingB = ratingsRows?.find(r => r.user_id === match.player_b_id);
  if (!ratingA || !ratingB) return { error: 'レート情報が見つかりません' };

  const ratingSettings = settings ? toRatingSettings(settings) : undefined;
  const result = calculateRatingUpdate(
    {
      playerAId:   match.player_a_id,
      playerBId:   match.player_b_id,
      winnerId:    match.winner_id,
      format:      match.match_format,
      playerASets: match.player_a_sets,
      playerBSets: match.player_b_sets,
    },
    { userId: match.player_a_id, rating: Number(ratingA.rating), approvedMatchCount: ratingA.approved_match_count },
    { userId: match.player_b_id, rating: Number(ratingB.rating), approvedMatchCount: ratingB.approved_match_count },
    ratingSettings,
  );

  const { error } = await supabase.rpc('admin_approve_match_with_ratings', {
    p_match_id:       matchId,
    p_a_rating_after: result.playerA.ratingAfter,
    p_a_result:       result.playerA.result,
    p_b_rating_after: result.playerB.ratingAfter,
    p_b_result:       result.playerB.result,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath('/ranking');
  return {};
}

export async function updateMemberRating(
  groupId: string,
  targetUserId: string,
  newRating: number,
): Promise<{ error?: string }> {
  if (!Number.isFinite(newRating) || newRating < 0 || newRating > 9999) {
    return { error: 'レートは 0〜9999 の整数で入力してください' };
  }

  const { supabase, user } = await getAdminClient();
  if (!user) return { error: '未認証' };

  const isAdmin = await checkAdminRole(supabase, user.id, groupId);
  if (!isAdmin) return { error: '権限がありません' };

  const { data: current } = await supabase
    .from('player_ratings')
    .select('highest_rating, lowest_rating')
    .eq('group_id', groupId).eq('user_id', targetUserId).single();

  const rounded = Math.round(newRating);
  const updateData: Record<string, unknown> = {
    rating:     rounded,
    updated_at: new Date().toISOString(),
  };
  if (current) {
    updateData.highest_rating = Math.max(Number(current.highest_rating), rounded);
    updateData.lowest_rating  = Math.min(Number(current.lowest_rating),  rounded);
  }

  const { error } = await supabase
    .from('player_ratings')
    .update(updateData)
    .eq('group_id', groupId).eq('user_id', targetUserId);
  if (error) return { error: error.message };

  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath('/ranking');
  return {};
}

export async function startNewSeason(
  groupId: string,
  seasonName: string,
  carryoverFactor: number,
  carryoverBase: number,
): Promise<{ error?: string }> {
  if (!seasonName.trim()) return { error: 'シーズン名を入力してください' };
  if (carryoverFactor < 0 || carryoverFactor > 1) return { error: '引き継ぎ率は 0〜1 で入力してください' };

  const { supabase, user } = await getAdminClient();
  if (!user) return { error: '未認証' };

  const isAdmin = await checkAdminRole(supabase, user.id, groupId);
  if (!isAdmin) return { error: '権限がありません' };

  const { error } = await supabase.rpc('start_new_season', {
    p_group_id:        groupId,
    p_season_name:     seasonName.trim(),
    p_carryover_factor: carryoverFactor,
    p_carryover_base:   carryoverBase,
  });
  if (error) return { error: error.message };

  revalidatePath('/admin');
  revalidatePath('/');
  revalidatePath('/ranking');
  return {};
}
