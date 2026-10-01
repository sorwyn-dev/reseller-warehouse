import { formatEuro } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  hint?: string;
}

export function StatCard({ title, value, hint }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-slate-500">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight text-slate-900">
          {value}
        </div>
        {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

export function Money({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const color =
    className ??
    (value > 0
      ? "text-emerald-700"
      : value < 0
        ? "text-red-600"
        : "text-slate-900");

  return <span className={color}>{formatEuro(value)}</span>;
}
