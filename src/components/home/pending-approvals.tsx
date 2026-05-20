import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Bell, ChevronRight } from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

interface PendingApprovalsProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  matches: any[];
  userId: string;
}

export function PendingApprovals({ matches, userId }: PendingApprovalsProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Bell className="h-4 w-4 text-[var(--color-provisional)]" />
        <h2 className="font-semibold text-sm">承認待ち</h2>
        <Badge variant="pending" className="ml-auto">{matches.length}</Badge>
      </div>
      <div className="space-y-2">
        {matches.map((match) => {
          const isPlayerA = match.player_a_id === userId;
          const isApprovalTarget = match.player_b_id === userId && match.submitted_by !== userId;
          const opponent = isPlayerA
            ? match['profiles!matches_player_b_id_fkey']
            : match['profiles!matches_player_a_id_fkey'];
          const opponentName = opponent?.nickname ?? '?';

          return (
            <Link
              key={match.id}
              href={`/match/${match.id}/approve`}
              className="flex items-center gap-3 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-provisional)]/50 transition-all"
            >
              <div className="w-2 h-2 rounded-full bg-[var(--color-provisional)] shrink-0 animate-pulse-neon" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {isApprovalTarget ? `${opponentName} から承認依頼` : `${opponentName} へ承認依頼中`}
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)]">{formatDateTime(match.created_at)}</p>
              </div>
              {isApprovalTarget && (
                <div className="flex items-center gap-1 text-[var(--color-provisional)] text-xs font-medium shrink-0">
                  承認する
                  <ChevronRight className="h-3 w-3" />
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
