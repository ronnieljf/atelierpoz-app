export default function HomeLoading() {
  return (
    <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 md:py-16">
      <div className="mb-8 sm:mb-12 md:mb-16">
        <div className="h-16 bg-neutral-800/50 rounded-2xl animate-pulse mb-4 max-w-2xl mx-auto" />
        <div className="h-6 bg-neutral-800/50 rounded-xl animate-pulse max-w-xl mx-auto" />
      </div>
      
      <div className="grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="rounded-3xl bg-neutral-900 border border-neutral-700/50 overflow-hidden">
            <div className="aspect-[4/5] bg-neutral-800 animate-pulse" />
            <div className="p-5 space-y-4">
              <div className="h-6 bg-neutral-800 rounded animate-pulse" />
              <div className="h-8 bg-neutral-800 rounded w-1/2 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
