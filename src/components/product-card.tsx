"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteProductAction } from "@/lib/actions";
import { calcProductFinance, calcProductProfit } from "@/lib/finance";
import type { Box, ProductWithSale } from "@/lib/types";
import { formatDate, formatEuro } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Money } from "@/components/stat-card";
import { SellProductButton } from "@/components/sell-product-button";

export function ProductCard({
  product,
  box,
  productCount,
}: {
  product: ProductWithSale;
  box: Box;
  productCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const finance = calcProductFinance(product, box, productCount);
  const profit = calcProductProfit(product);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
        <div className="h-28 w-full shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-28 sm:w-28">
          {product.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.photo_url}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-slate-400">
              Нет фото
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="truncate text-base font-semibold text-slate-900">
                {product.name}
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">ID: {product.id}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant={product.status === "sold" ? "success" : "muted"}>
                  {product.status === "sold" ? "Продана" : "На складе"}
                </Badge>
                {product.category ? <Badge>{product.category}</Badge> : null}
                {product.size ? <Badge variant="default">р. {product.size}</Badge> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <SellProductButton product={product} boxId={box.id} />
              {product.status === "in_stock" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isPending}
                  onClick={() => {
                    if (!confirm(`Удалить «${product.name}»?`)) return;
                    startTransition(async () => {
                      await deleteProductAction(product.id, box.id);
                      router.refresh();
                    });
                  }}
                >
                  Удалить
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <div className="text-slate-500">Закупка</div>
              <div className="font-medium">
                {formatEuro(finance.effectiveCost.purchasePrice)}
              </div>
            </div>
            <div>
              <div className="text-slate-500">Себестоимость</div>
              <div className="font-medium">
                {formatEuro(finance.effectiveCost.unitCost)}
              </div>
              <div className="text-xs text-slate-400">
                доставка {formatEuro(finance.effectiveCost.shippingShare)} · доп.{" "}
                {formatEuro(finance.effectiveCost.additionalShare)}
              </div>
            </div>
            {product.status === "sold" && product.sale ? (
              <>
                <div>
                  <div className="text-slate-500">Продажа</div>
                  <div className="font-medium">
                    {formatEuro(product.sale.sale_price)}
                  </div>
                  <div className="text-xs text-slate-400">
                    {formatDate(product.sale.sold_at)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Прибыль</div>
                  <div className="font-medium">
                    <Money value={profit ?? 0} />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <div className="text-slate-500">План. цена</div>
                <div className="font-medium">
                  {product.asking_price != null
                    ? formatEuro(product.asking_price)
                    : "—"}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
