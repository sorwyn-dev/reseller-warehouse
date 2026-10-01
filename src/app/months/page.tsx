import type { ReactNode } from "react";
import Link from "next/link";
import { listBoxes } from "@/lib/data/repository";
import { calcMonthlyStats } from "@/lib/finance";
import { formatEuro } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money, StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

function capitalize(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function MonthsPage() {
  const boxes = await listBoxes();
  const months = calcMonthlyStats(
    boxes.map((box) => ({ box, products: box.products })),
  );

  const current = months[0] ?? null;
  const totals = months.reduce(
    (acc, month) => ({
      revenue: acc.revenue + month.revenue,
      netProfit: acc.netProfit + month.netProfit,
      soldCount: acc.soldCount + month.soldCount,
    }),
    { revenue: 0, netProfit: 0, soldCount: 0 },
  );

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Дашборд по месяцам
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
          Выручка и прибыль считаются по дате продажи. Поступление коробок —
          по дате прихода на склад.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Выручка за всё время"
          value={formatEuro(totals.revenue)}
        />
        <StatCard
          title="Прибыль за всё время"
          value={formatEuro(totals.netProfit)}
        />
        <StatCard title="Продано вещей" value={String(totals.soldCount)} />
        <StatCard
          title={current ? capitalize(current.label) : "Текущий месяц"}
          value={current ? formatEuro(current.revenue) : formatEuro(0)}
          hint={
            current
              ? `Прибыль ${formatEuro(current.netProfit)}`
              : "Пока нет данных"
          }
        />
      </section>

      {months.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <h3 className="text-lg font-medium text-slate-900">Пока нет данных</h3>
          <p className="mt-2 text-sm text-slate-500">
            Добавьте коробку или оформите продажу — месяцы появятся здесь.
          </p>
          <div className="mt-6">
            <Link
              href="/boxes/new"
              className="inline-flex h-10 items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
              Добавить коробку
            </Link>
          </div>
        </div>
      ) : (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">По месяцам</h2>
          <div className="grid gap-4">
            {months.map((month) => (
              <Card key={month.key}>
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg">
                    {capitalize(month.label)}
                  </CardTitle>
                  <div className="text-sm text-slate-500">
                    продано {month.soldCount} · коробок {month.boxesReceived}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
                    <Metric label="Выручка" value={formatEuro(month.revenue)} />
                    <Metric
                      label="Себестоимость продаж"
                      value={formatEuro(month.soldCost)}
                    />
                    <Metric
                      label="Расходы на продажу"
                      value={formatEuro(month.saleExpensesTotal)}
                    />
                    <Metric
                      label="Чистая прибыль"
                      value={<Money value={month.netProfit} />}
                    />
                    <Metric
                      label="Коробок поступило"
                      value={String(month.boxesReceived)}
                    />
                    <Metric
                      label="Вложено в поступления"
                      value={formatEuro(month.purchaseInvested)}
                      hint="Закупка + доставка + доп. расходы"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
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
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-slate-400">{hint}</div> : null}
    </div>
  );
}
