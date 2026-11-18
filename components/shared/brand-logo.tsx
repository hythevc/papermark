import { BRAND } from "@/lib/brand";

export function BrandLogo({
  compact = false,
  className = "",
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 32 32"
        fill="none"
        className="h-7 w-7 shrink-0"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="9" fill="#146354" />
        <path
          d="M10 23V9h6.5a4.5 4.5 0 0 1 0 9H10m6.5 0L22 23"
          stroke="#FFFFFF"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {compact ? (
        <span className="sr-only">{BRAND.name}</span>
      ) : (
        <span className="text-[1.375rem] font-semibold tracking-[-0.045em]">
          {BRAND.name}
        </span>
      )}
    </span>
  );
}
