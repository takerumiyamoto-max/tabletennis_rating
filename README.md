# 卓球レーティング管理アプリ — 仕様書

## 概要

卓球の試合結果を入力すると、相手の承認後に Elo レーティングが自動計算され、ランキング・履歴・グラフとして表示されるWebアプリです。大学の卓球部・サークル向けに設計されており、将来的には複数グループに対応します。

https://supabase.com/dashboard/project/gallvmeahyyaslxnwxdb/sql/c18e6e03-8a26-4685-b8c6-0f7eadbc2eeb

https://vercel.com/takerumiyamoto-maxs-projects/tabletennis-rating/BpUirhU4cNkvD53hgfyynRg1eSer

https://resend.com/logs/8b160d70-53d0-4e88-9c2e-7336d8b35901

---

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router), TypeScript, Tailwind CSS v4, shadcn/ui |
| バックエンド | Supabase (Auth + PostgreSQL + Storage) |
| グラフ | Recharts |
| ホスティング | Vercel (予定) |

---

## 主な機能

1. アカウント作成・ログイン (Supabase Auth)
2. プロフィール作成 (ニックネーム・アイコン画像)
3. グループ作成・参加
4. グループごとの初期レートラベル設定
5. 試合結果入力
6. 相手による承認フロー
7. 承認後のレート自動計算 (Elo Rating)
8. ランキング表示
9. 個人の試合履歴
10. レート推移グラフ
11. 管理者画面

---

## レーティング設計

### Elo Rating 計算式

```
E_A = 1 / (1 + 10^((R_B - R_A) / 400))
E_B = 1 - E_A

R_A_new = R_A + K_A × M × (S_A - E_A)
R_B_new = R_B + K_B × M × (S_B - E_B)
```

- S_A: 勝利=1, 敗北=0
- S_B: 1 - S_A

### K値 (承認済み試合数による)

| 試合数 | K値 |
|---|---|
| 0〜9試合 | 48 |
| 10〜29試合 | 32 |
| 30試合以上 | 24 |

### セットカウント補正 M

| 形式 | スコア | M |
|---|---|---|
| 5ゲームマッチ | 3-0 | 1.25 |
| 5ゲームマッチ | 3-1 | 1.10 |
| 5ゲームマッチ | 3-2 | 1.00 |
| 3ゲームマッチ | 2-0 | 1.15 |
| 3ゲームマッチ | 2-1 | 1.00 |

### 仮レート

- 承認済み試合数が10試合未満のユーザーは「仮レート」として表示
- DBには小数で保存し、UI表示は整数に丸める

---

## 初期レート設計

グループごとに初期レートラベルを設定できます。

### デフォルトテンプレート

| ラベル | 初期レート |
|---|---|
| 未経験・初心者 | 1000 |
| 大学始め | 1150 |
| 中学経験者 | 1300 |
| 高校経験者 | 1450 |
| 大会経験者 | 1600 |
| 上級者 | 1750 |

参加者はグループ参加時にラベルを選択し、その初期レートが `player_ratings.initial_rating` にコピーされます。
ラベルを後から変更しても既存参加者の初期レートは変わりません。

### 初期ラベル変更ルール

- 承認済み試合数0件: 本人が変更可
- 承認済み試合数1件以上: 管理者のみ変更可

---

## 承認フロー

```
A が試合結果入力
  → status = pending
  → B に承認依頼通知
B が承認
  → status = approved
  → レート計算実行
  → player_ratings 更新
  → rating_histories に両者の変動を保存
  → ランキング・グラフに反映
```

### match.status 値

| 値 | 説明 |
|---|---|
| pending | 承認待ち |
| approved | 承認済み |
| rejected | 却下 |
| cancelled | キャンセル |
| corrected | 修正済み (管理者操作) |

---

## DB設計

### テーブル一覧

- **profiles** — ユーザープロフィール (nickname, avatar_url)
- **groups** — グループ (name, slug, description)
- **group_members** — グループメンバー (role: owner/admin/member, status: active/invited/suspended)
- **group_rating_settings** — グループごとのレート設定 (K値、補正係数等)
- **initial_rating_labels** — 初期レートラベル
- **player_ratings** — プレイヤーごとのレート (rating, initial_rating, wins, losses, streak等)
- **matches** — 試合記録 (status, format, sets, winner等)
- **rating_histories** — レート変動履歴
- **notifications** — 通知

### RLS

全テーブルに Row Level Security を設定。グループメンバーのみが自グループのデータにアクセス可能。

---

## UI設計

### デザイン方針

- **テーマ**: ダークネイビー背景、ネオンブルーアクセント
- **レイアウト**: モバイルファースト、下部タブナビゲーション
- **カード型UI** + shadcn/ui
- 勝利: 緑 (`#22c55e`)
- 敗北: 赤 (`#ef4444`)
- レート上昇: 緑、下降: 赤

### 画面一覧

| 画面 | パス |
|---|---|
| ログイン | `/login` |
| サインアップ | `/signup` |
| オンボーディング | `/onboarding` |
| ホーム | `/` |
| 試合入力 | `/match` |
| 試合承認 | `/match/[id]/approve` |
| ランキング | `/ranking` |
| 履歴 | `/history` |
| マイページ | `/profile` |
| 管理者 | `/admin` |

---

## 開発手順

### 環境変数 (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### ローカル開発

```bash
npm install
npm run dev
```

### Supabase セットアップ

1. Supabase プロジェクト作成
2. `supabase/migrations/001_initial_schema.sql` を実行
3. `supabase/seed.sql` でテストデータ投入 (任意)
4. `.env.local` に URL と ANON KEY を設定

---

## ディレクトリ構成

```
src/
├── app/
│   ├── (auth)/          # 認証ページ
│   ├── (main)/          # メインアプリ (下部ナビ付き)
│   ├── (admin)/         # 管理者画面
│   └── onboarding/      # 初回セットアップ
├── components/
│   ├── ui/              # shadcn/ui ベースコンポーネント
│   ├── home/
│   ├── match/
│   ├── ranking/
│   ├── history/
│   ├── profile/
│   ├── admin/
│   └── shared/
├── hooks/
├── lib/
│   ├── supabase/        # Supabase クライアント
│   └── rating/          # Elo 計算 (pure functions)
└── types/               # TypeScript 型定義
supabase/
├── migrations/
└── seed.sql
```
