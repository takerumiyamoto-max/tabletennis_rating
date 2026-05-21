'use client';

import Link from 'next/link';
import { StaggerList, StaggerItem } from '@/components/ui/motion';
import { Bell, ChevronRight, Clock } from 'lucide-react';
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
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-provisional)] animate-pulse-neon" />
          <Bell className="h-4 w-4 text-[var(--color-provisional)]" />
          <h2 className="font-semibold text-sm">承認待ち</h2>
        </div>
        <span className="ml-auto min-w-[1.25rem] h-5 px-1.5 bg-[var(--color-provisional)]/20 text-[var(--color-provisional)] rounded-full text-[10px] font-bold flex items-center justify-center border border-[var(--color-provisional)]/30">
          {matches.length}
        </span>
      </div>

      <StaggerList className="space-y-2">
        {matches.map((match) => {
          const isApprovalTarget = match.player_b_id === userId && match.submitted_by !== userId;
          const isPlayerA = match.player_a_id === userId;
          const opponent = isPlayerA
            ? match['profiles!matches_player_b_id_fkey']
            : match['profiles!matches_player_a_id_fkey'];
          const opponentName = opponent?.nickname ?? '?';

          return (
            <StaggerItem key={match.id}>
              <Link
                href={`/match/${match.id}/approve`}
                className="flex items-center gap-3 p-3 rounded-xl border transition-all overflow-hidden relative group"
                style={{
                  borderColor: isApprovalTarget ? 'rgba(245,158,11,0.5)' : 'var(--color-border)',
                  background: isApprovalTarget
                    ? 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, var(--color-card) 60%)'
                    : 'var(--color-card)',
                  boxShadow: isApprovalTarget ? '0 2px 12px rgba(245,158,11,0.1)' : undefined,
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {isApprovalTarget
                      ? <><span className="text-[var(--color-provisional)]">{opponentName}</span> から承認依頼</>
                      : <>{opponentName} へ承認依頼中</>
                    }
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="h-3 w-3 text-[var(--color-muted-foreground)]" />
                    <p className="text-[10px] text-[var(--color-muted-foreground)]">{formatDateTime(match.created_at)}</p>
                  </div>
                </div>

                {isApprovalTarget ? (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-provisional)]/15 border border-[var(--color-provisional)]/30 text-[var(--color-provisional)] text-xs font-bold shrink-0 group-hover:bg-[var(--color-provisional)]/25 transition-colors">
                    承認する
                    <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                ) : (
                  <div className="text-[var(--color-muted-foreground)] text-xs shrink-0">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                )}
              </Link>
            </StaggerItem>
          );
        })}
      </StaggerList>
    </div>
  );
}
