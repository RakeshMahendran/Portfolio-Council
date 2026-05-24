// Friendly empty state with optional CTA.

import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "border border-dashed border-zinc-800 rounded-lg p-8 text-center space-y-3",
        className,
      )}
    >
      {Icon && (
        <Icon className="w-10 h-10 mx-auto text-zinc-600" strokeWidth={1.5} />
      )}
      <div>
        <div className="text-sm font-medium text-zinc-200">{title}</div>
        {description && (
          <div className="text-xs text-zinc-500 mt-1 max-w-md mx-auto">
            {description}
          </div>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
