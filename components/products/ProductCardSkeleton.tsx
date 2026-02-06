export function ProductCardSkeleton() {
  return (
    <div className="group relative flex flex-col overflow-hidden rounded-none sm:rounded-3xl bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 border-0 sm:border border-neutral-700/50 shadow-none sm:shadow-xl animate-pulse">
      <div className="relative aspect-square sm:aspect-[4/5] overflow-hidden bg-neutral-800">
        <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 via-neutral-700 to-neutral-800" />
      </div>
      <div className="p-2 sm:p-4 flex flex-1 flex-col space-y-1.5 sm:space-y-3 bg-gradient-to-b from-transparent to-neutral-900/50">
        <div className="h-3 sm:h-5 bg-neutral-700 rounded w-3/4" />
        <div className="h-3 sm:h-4 bg-neutral-700 rounded w-1/2" />
        <div className="h-5 sm:h-7 bg-neutral-700 rounded w-1/3" />
        <div className="h-8 sm:h-10 bg-neutral-700 rounded-lg sm:rounded-xl mt-1" />
      </div>
    </div>
  );
}
