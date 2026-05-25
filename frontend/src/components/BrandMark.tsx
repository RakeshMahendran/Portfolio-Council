import { clsx } from "clsx";

/**
 * Portfolio Council brand mark.
 *
 * A "council" motif: four agent nodes arranged around a central hub, linked
 * by thin edges — five deliberating agents converging on one decision. Pure
 * SVG with a violet→indigo gradient fill so it stays crisp at any size.
 */
export function BrandMark({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}) {
  const gid = "pc-brand-grad";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={clsx("shrink-0", className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="0.5" stopColor="#14b8a6" />
          <stop offset="1" stopColor="#06b6d4" />
        </linearGradient>
      </defs>

      {/* Rounded-square badge */}
      <rect x="2" y="2" width="44" height="44" rx="12" fill={`url(#${gid})`} />

      {/* Connecting edges from the four nodes to the centre hub */}
      <g stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1.6" strokeLinecap="round">
        <line x1="24" y1="24" x2="24" y2="12" />
        <line x1="24" y1="24" x2="35" y2="24" />
        <line x1="24" y1="24" x2="24" y2="36" />
        <line x1="24" y1="24" x2="13" y2="24" />
      </g>

      {/* Four agent nodes */}
      <g fill="#ffffff">
        <circle cx="24" cy="12" r="3.1" />
        <circle cx="35" cy="24" r="3.1" />
        <circle cx="24" cy="36" r="3.1" />
        <circle cx="13" cy="24" r="3.1" />
      </g>

      {/* Central decision hub */}
      <circle cx="24" cy="24" r="4.4" fill="#ffffff" />
      <circle cx="24" cy="24" r="2" fill="#14b8a6" />
    </svg>
  );
}
