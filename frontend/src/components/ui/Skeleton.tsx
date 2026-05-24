// Loading placeholder. Use for any pending data fetch.

import { clsx } from "clsx";

export function Skeleton({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      {...rest}
      className={clsx(
        "animate-pulse rounded bg-zinc-800/70",
        className,
      )}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-3"
          style={{ width: `${75 + ((i * 13) % 25)}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="border border-zinc-800 rounded-lg p-5 space-y-3">
      <Skeleton className="h-4 w-32" />
      <SkeletonText lines={3} />
    </div>
  );
}
