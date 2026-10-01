import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  variant?: "default" | "success" | "muted" | "warning";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variant === "default" && "bg-slate-100 text-slate-700",
        variant === "success" && "bg-emerald-50 text-emerald-700",
        variant === "muted" && "bg-slate-50 text-slate-500",
        variant === "warning" && "bg-amber-50 text-amber-700",
        className,
      )}
      {...props}
    />
  );
}
