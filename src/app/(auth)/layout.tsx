export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[var(--color-neon-dim)] border border-[var(--color-primary)]/30 mb-4 neon-glow">
            <span className="text-3xl">🏓</span>
          </div>
          <h1 className="text-2xl font-bold neon-text tracking-tight">卓球レーティング</h1>
          <p className="text-[var(--color-muted-foreground)] text-sm mt-1">部活・サークルのレート管理</p>
        </div>
        {children}
      </div>
    </div>
  );
}
