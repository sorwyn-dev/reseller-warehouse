import type { ReactNode } from "react";
import type { BoxFinance } from "@/lib/types";
import { formatEuro } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/stat-card";

export function BoxFinancePanel({ finance }: { finance: BoxFinance }) {
  const progress =
    finance.productCount === 0
      ? 0
      : Math.round((finance.soldCount / finance.productCount) * 100);

  return (
    <Card className="border-slate-200 bg-slate-50/70">
      <CardHeader>
        <CardTitle>Финансовые показатели</CardTitle>
        <p className="text-sm text-slate-500">
          {finance.soldCount} из {finance.productCount} вещей продано
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
            <span>Прогресс продаж</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-emerald-600"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Metric label="Общая выручка" value={formatEuro(finance.revenue)} />
          <Metric
            label="Чистая прибыль"
            value={<Money value={finance.netProfit} />}
          />
          <Metric
            label="Себестоимость проданных"
            value={formatEuro(finance.soldCost)}
            hint={`Закупка ${formatEuro(finance.soldPurchaseTotal)} · доставка ${formatEuro(finance.soldShippingShare)} · доп. ${formatEuro(finance.soldAdditionalShare)}`}
          />
          <Metric
            label="Расходы на продажу"
            value={formatEuro(finance.saleExpensesTotal)}
            hint={`Комиссии ${formatEuro(finance.saleCommissions)} · прочее ${formatEuro(finance.saleExtraExpenses)}`}
          />
          <Metric
            label="Осталось на складе"
            value={String(finance.remainingCount)}
          />
          <Metric
            label="Вложено в непроданные"
            value={formatEuro(finance.investedInUnsold)}
          />
          <Metric
            label="Потенциальная выручка"
            value={formatEuro(finance.potentialRevenue)}
            hint="По ценам продажи, указанным для оставшихся вещей"
          />
          <Metric
            label="Общая себестоимость коробки"
            value={formatEuro(finance.totalCost)}
            hint={`Закупка ${formatEuro(finance.purchaseTotal)} + доставка ${formatEuro(finance.shippingCost)} + доп. ${formatEuro(finance.additionalExpenses)}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
