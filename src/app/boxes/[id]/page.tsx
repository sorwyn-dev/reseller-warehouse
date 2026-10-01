import Link from "next/link";
import { notFound } from "next/navigation";
import { getBox } from "@/lib/data/repository";
import { calcBoxFinance } from "@/lib/finance";
import { formatDate } from "@/lib/utils";
import { AddProductButton } from "@/components/add-product-button";
import { BoxFinancePanel } from "@/components/box-finance-panel";
import { BoxSettingsForm } from "@/components/box-settings-form";
import { ProductCard } from "@/components/product-card";

export const dynamic = "force-dynamic";

export default async function BoxDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const box = await getBox(id);
  if (!box) notFound();

  const finance = calcBoxFinance(box, box.products);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/" className="text-sm text-slate-500 hover:text-slate-800">
            ← Все коробки
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">
            {box.number}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Поступление {formatDate(box.received_at)}
            {box.comment ? ` · ${box.comment}` : ""}
          </p>
        </div>
        <AddProductButton boxId={box.id} />
      </div>

      <BoxFinancePanel finance={finance} />

      <BoxSettingsForm box={box} />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Вещи</h2>
          <span className="text-sm text-slate-500">
            {finance.soldCount} из {finance.productCount} продано
          </span>
        </div>

        {box.products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
            В коробке пока нет вещей. Добавьте первую.
          </div>
        ) : (
          <div className="grid gap-4">
            {box.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                box={box}
                productCount={finance.productCount}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
