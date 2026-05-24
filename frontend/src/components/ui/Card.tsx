// Consistent card wrapper.

import { clsx } from "clsx";

export function Card({
  className,
  hover = false,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div
      {...rest}
      className={clsx(
        "border border-zinc-800 rounded-lg bg-zinc-900/40",
        hover && "hover:border-zinc-700 hover:bg-zinc-900/70 transition-colors",
        className,
      )}
    />
  );
}

export function CardHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("px-5 py-4 border-b border-zinc-800/60 flex items-start justify-between gap-3", className)}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-zinc-100">{title}</div>
        {subtitle && (
          <div className="text-xs text-zinc-500 mt-1 max-w-prose">
            {subtitle}
          </div>
        )}
      </div>
      {actions && <div className="flex gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function CardBody({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...rest} className={clsx("p-5", className)} />;
}
