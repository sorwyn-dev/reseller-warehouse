import Link from "next/link";
import { PackagePlus } from "lucide-react";
import { listBoxes } from "@/lib/data/repository";
import { calcDashboardStats } from "@/lib/finance";
import { formatEuro } from "@/lib/utils";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { BoxListItem } from "@/components/box-list-item";
import { StatCard } from "@/components/stat-card";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const boxes = await listBoxes();
  const stats = calcDashboardStats(
    boxes.map((box) => ({ box, products: box.products })),
  );
  const recentBoxes = boxes.slice(0, 10);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Обзор склада
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
            Добавляйте коробки, учитывайте закупку и доставку, регистрируйте
            продажи и сразу видьте выручку и чистую прибыль по каждой коробке.
          </p>
        </div>
        <Link
          href="/boxes/new"
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
        >
          <PackagePlus className="h-4 w-4" />
          Добавить коробку
        </Link>
      </section>

      {isSupabaseConfigured() ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Supabase подключён. Если таблицы ещё не созданы, выполните SQL из{" "}
          <code className="rounded bg-emerald-100 px-1">supabase/migrations/001_initial.sql</code>{" "}
          в{" "}
          <a
            className="underline"
            href="https://supabase.com/dashboard/project/meexprxlocputrvnpmjk/sql/new"
            target="_blank"
            rel="noreferrer"
          >
            SQL Editor
          </a>
          .
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Supabase пока не настроен — данные сохраняются локально в{" "}
          <code className="rounded bg-amber-100 px-1">data/store.json</code>.
          Заполните <code className="rounded bg-amber-100 px-1">.env.local</code> по образцу{" "}
          <code className="rounded bg-amber-100 px-1">.env.example</code>.
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Коробок" value={String(stats.boxCount)} />
        <StatCard
          title="Товаров на складе"
          value={String(stats.stockCount)}
          hint="Только непроданные вещи"
        />
        <StatCard
          title="Общая выручка"
          value={formatEuro(stats.totalRevenue)}
        />
        <StatCard
          title="Чистая прибыль"
          value={formatEuro(stats.totalNetProfit)}
          hint="Выручка − себестоимость проданных − расходы на продажу"
        />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Последние коробки</h2>
          <Link href="/months" className="text-sm text-slate-500 hover:text-slate-800">
            Дашборд по месяцам →
          </Link>
        </div>

        {recentBoxes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <h3 className="text-lg font-medium text-slate-900">Пока пусто</h3>
            <p className="mt-2 text-sm text-slate-500">
              Создайте первую коробку и добавьте в неё вещи.
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
          <div className="grid gap-4">
            {recentBoxes.map((box) => (
              <BoxListItem key={box.id} box={box} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
