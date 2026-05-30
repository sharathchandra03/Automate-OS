import { cn, initials } from "@/lib/utils";

export function Avatar({ name, size = 32, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-accent text-accent-foreground font-semibold uppercase",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.floor(size / 2.5)) }}
    >
      {initials(name) || "?"}
    </span>
  );
}
