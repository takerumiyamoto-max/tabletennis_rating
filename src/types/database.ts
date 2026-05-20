// Supabase v2 生成型と互換する Database 型定義

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

// ────────────────────────────────────────────────────────────
// Enum types
// ────────────────────────────────────────────────────────────
export type MemberRole   = 'owner' | 'admin' | 'member';
export type MemberStatus = 'active' | 'invited' | 'suspended';
export type MatchStatus  = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'corrected';
export type MatchFormat  = 'best_of_3' | 'best_of_5';
export type MatchResult  = 'win' | 'loss';

// ────────────────────────────────────────────────────────────
// Row interfaces (DB の Row 型そのまま)
// ────────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Group {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: MemberRole;
  status: MemberStatus;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GroupRatingSettings {
  id: string;
  group_id: string;
  elo_scale: number;
  k_new: number;
  k_normal: number;
  k_stable: number;
  new_until_matches: number;
  stable_from_matches: number;
  best_of_3_straight_multiplier: number;
  best_of_3_full_multiplier: number;
  best_of_5_straight_multiplier: number;
  best_of_5_four_game_multiplier: number;
  best_of_5_full_multiplier: number;
  created_at: string;
  updated_at: string;
}

export interface InitialRatingLabel {
  id: string;
  group_id: string;
  label: string;
  description: string | null;
  initial_rating: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlayerRating {
  id: string;
  group_id: string;
  user_id: string;
  rating: number;
  initial_rating: number;
  initial_rating_label_id: string | null;
  approved_match_count: number;
  wins: number;
  losses: number;
  current_streak: number;
  highest_rating: number;
  lowest_rating: number;
  is_provisional: boolean;
  created_at: string;
  updated_at: string;
}

export interface Match {
  id: string;
  group_id: string;
  submitted_by: string;
  player_a_id: string;
  player_b_id: string;
  winner_id: string;
  match_format: MatchFormat;
  player_a_sets: number;
  player_b_sets: number;
  status: MatchStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  cancelled_by: string | null;
  cancelled_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface RatingHistory {
  id: string;
  group_id: string;
  match_id: string;
  user_id: string;
  opponent_id: string;
  rating_before: number;
  rating_after: number;
  rating_change: number;
  result: MatchResult;
  created_at: string;
}

export interface Notification {
  id: string;
  group_id: string | null;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  related_match_id: string | null;
  read_at: string | null;
  created_at: string;
}

// ────────────────────────────────────────────────────────────
// Database 型 (Supabase v2 生成形式に準拠)
// ────────────────────────────────────────────────────────────
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id?: string;
          user_id: string;
          nickname: string;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nickname?: string;
          avatar_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: Group;
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          icon_url?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          icon_url?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: GroupMember;
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role?: MemberRole;
          status?: MemberStatus;
          joined_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          role?: MemberRole;
          status?: MemberStatus;
          joined_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'group_members_group_id_fkey';
            columns: ['group_id'];
            isOneToOne: false;
            referencedRelation: 'groups';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'group_members_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };
      group_rating_settings: {
        Row: GroupRatingSettings;
        Insert: {
          id?: string;
          group_id: string;
          elo_scale?: number;
          k_new?: number;
          k_normal?: number;
          k_stable?: number;
          new_until_matches?: number;
          stable_from_matches?: number;
          best_of_3_straight_multiplier?: number;
          best_of_3_full_multiplier?: number;
          best_of_5_straight_multiplier?: number;
          best_of_5_four_game_multiplier?: number;
          best_of_5_full_multiplier?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          elo_scale?: number;
          k_new?: number;
          k_normal?: number;
          k_stable?: number;
          new_until_matches?: number;
          stable_from_matches?: number;
          best_of_3_straight_multiplier?: number;
          best_of_3_full_multiplier?: number;
          best_of_5_straight_multiplier?: number;
          best_of_5_four_game_multiplier?: number;
          best_of_5_full_multiplier?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      initial_rating_labels: {
        Row: InitialRatingLabel;
        Insert: {
          id?: string;
          group_id: string;
          label: string;
          description?: string | null;
          initial_rating: number;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          label?: string;
          description?: string | null;
          initial_rating?: number;
          sort_order?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      player_ratings: {
        Row: PlayerRating;
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          rating: number;
          initial_rating: number;
          initial_rating_label_id?: string | null;
          approved_match_count?: number;
          wins?: number;
          losses?: number;
          current_streak?: number;
          highest_rating: number;
          lowest_rating: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          rating?: number;
          initial_rating?: number;
          initial_rating_label_id?: string | null;
          approved_match_count?: number;
          wins?: number;
          losses?: number;
          current_streak?: number;
          highest_rating?: number;
          lowest_rating?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      matches: {
        Row: Match;
        Insert: {
          id?: string;
          group_id: string;
          submitted_by: string;
          player_a_id: string;
          player_b_id: string;
          winner_id: string;
          match_format: MatchFormat;
          player_a_sets: number;
          player_b_sets: number;
          status?: MatchStatus;
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_by?: string | null;
          rejected_at?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: MatchStatus;
          approved_by?: string | null;
          approved_at?: string | null;
          rejected_by?: string | null;
          rejected_at?: string | null;
          cancelled_by?: string | null;
          cancelled_at?: string | null;
          note?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      rating_histories: {
        Row: RatingHistory;
        Insert: {
          id?: string;
          group_id: string;
          match_id: string;
          user_id: string;
          opponent_id: string;
          rating_before: number;
          rating_after: number;
          rating_change: number;
          result: MatchResult;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [
          {
            foreignKeyName: 'rating_histories_match_id_fkey';
            columns: ['match_id'];
            isOneToOne: false;
            referencedRelation: 'matches';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: Notification;
        Insert: {
          id?: string;
          group_id?: string | null;
          user_id: string;
          type: string;
          title: string;
          body?: string | null;
          related_match_id?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      member_role:   MemberRole;
      member_status: MemberStatus;
      match_status:  MatchStatus;
      match_format:  MatchFormat;
      match_result:  MatchResult;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
