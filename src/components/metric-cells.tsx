import { fmt, fmtDiff } from "@/lib/calc";
import { cn } from "@/lib/utils";

export function Value({ value, decimals = 1 }: { value: number | null; decimals?: number }) {
  return <span className="numeric">{fmt(value, decimals)}</span>;
}

/** Diferencia neutral: sin juicio de valor. Sólo dirección. */
export function Diff({ value, decimals = 1 }: { value: number | null; decimals?: number }) {
  const dir = value === null ? "none" : value > 0 ? "up" : value < 0 ? "down" : "eq";
  return (
    <span
      className={cn(
        "numeric inline-flex min-w-14 justify-center rounded-md px-1.5 py-0.5 text-xs font-semibold",
        dir === "up" && "bg-up/10 text-up",
        dir === "down" && "bg-down/10 text-down",
        dir === "eq" && "bg-muted text-muted-foreground",
        dir === "none" && "text-muted-foreground",
      )}
    >
      {fmtDiff(value, decimals)}
    </span>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="panel-title mb-3 text-xs font-semibold text-muted-foreground">{children}</h2>;
}
