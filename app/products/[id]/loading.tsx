export default function ProductLoading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
        {/* Skeleton para imagen */}
        <div className="space-y-4">
          <div className="aspect-square rounded-3xl bg-neutral-800 animate-pulse" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-square rounded-2xl bg-neutral-800 animate-pulse" />
            ))}
          </div>
        </div>
        
        {/* Skeleton para información */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-neutral-800/50 p-6 animate-pulse">
            <div className="h-8 bg-neutral-700 rounded mb-3" />
            <div className="h-10 bg-neutral-700 rounded w-1/2" />
          </div>
          <div className="h-32 bg-neutral-800/50 rounded-xl animate-pulse" />
          <div className="h-32 bg-neutral-800/50 rounded-xl animate-pulse" />
          <div className="h-16 bg-neutral-800/50 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}
