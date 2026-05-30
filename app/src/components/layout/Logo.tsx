import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/config";

export function Logo({ className, withName = true, size = 28 }: { className?: string; withName?: boolean; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
        <defs>
          <linearGradient id="logoG" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#5B5BF7" />
            <stop offset="1" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
        <rect width="32" height="32" rx="8" fill="url(#logoG)" />
        <path d="M9 22V10h4l3 7 3-7h4v12h-3v-7l-2.5 6h-3L12 15v7H9z" fill="#fff" />
      </svg>
      {withName && <span>{APP_NAME}</span>}
    </span>
  );
}
