'use client';

export default function AdminLoading() {
  return (
    <div className="flex min-h-[32vh] w-full flex-col items-center justify-center">
      <div className="h-px w-full max-w-[180px] overflow-hidden rounded-full bg-neutral-800/80">
        <div className="animate-admin-loading-bar h-full w-1/3 rounded-full bg-primary-500/50" />
      </div>
    </div>
  );
}
