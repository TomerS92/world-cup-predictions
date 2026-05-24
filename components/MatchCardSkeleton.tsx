export function MatchCardSkeleton() {
  return (
    <article className="relative rounded-2xl overflow-hidden border border-white/5 bg-gradient-to-b from-[#0D1829] to-[#080E1A]">
      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-black/30 border-b border-white/5">
        <div className="h-3 w-24 rounded-full bg-white/6 animate-shimmer" />
        <div className="h-3 w-16 rounded-full bg-white/6 animate-shimmer" />
      </div>

      <div className="p-5 space-y-4">
        {/* Teams + score */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          {/* Home team */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-white/6 animate-shimmer" />
            <div className="h-2.5 w-16 rounded-full bg-white/6 animate-shimmer" />
          </div>
          {/* Score boxes */}
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-white/6 animate-shimmer" />
            <div className="h-4 w-2 bg-white/4" />
            <div className="w-12 h-12 rounded-xl bg-white/6 animate-shimmer" />
          </div>
          {/* Away team */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-xl bg-white/6 animate-shimmer" />
            <div className="h-2.5 w-16 rounded-full bg-white/6 animate-shimmer" />
          </div>
        </div>

        {/* Bonus question row */}
        <div className="bg-white/3 border border-white/5 rounded-xl p-3 space-y-2">
          <div className="h-3 w-3/4 rounded-full bg-white/6 animate-shimmer" />
          <div className="flex gap-2">
            <div className="h-7 w-14 rounded-lg bg-white/6 animate-shimmer" />
            <div className="h-7 w-14 rounded-lg bg-white/6 animate-shimmer" />
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-2 pt-1">
          <div className="h-10 w-full rounded-xl bg-white/4 animate-shimmer" />
          <div className="h-11 w-full rounded-xl bg-emerald-600/20 animate-shimmer" />
        </div>
      </div>
    </article>
  );
}
