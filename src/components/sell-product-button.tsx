"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sellProductAction, cancelSaleAction } from "@/lib/actions";
import type { ProductWithSale } from "@/lib/types";
import { parseNumber, todayISODate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function SellProductButton({
  product,
  boxId,
}: {
  product: ProductWithSale;
  boxId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [salePrice, setSalePrice] = useState(
    product.asking_price != null ? String(product.asking_price) : "",
  );
  const [soldAt, setSoldAt] = useState(todayISODate());
  const [commission, setCommission] = useState("0");
  const [saleExpenses, setSaleExpenses] = useState("0");
  const [comment, setComment] = useState("");

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await sellProductAction(product.id, boxId, {
          sale_price: parseNumber(salePrice),
          sold_at: soldAt,
          commission: parseNumber(commission),
          sale_expenses: parseNumber(saleExpenses),
          comment: comment.trim() || null,
        });
        setOpen(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось оформить продажу");
      }
    });
  }

  if (product.status === "sold") {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isPending}
        onClick={() => {
          if (!confirm("Отменить продажу и вернуть товар на склад?")) return;
          startTransition(async () => {
            await cancelSaleAction(product.id, boxId);
            router.refresh();
          });
        }}
      >
        {isPending ? "..." : "Отменить продажу"}
      </Button>
    );
  }

  return (
    <>
      <Button type="button" variant="success" size="sm" onClick={() => setOpen(true)}>
        Продать
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Оформить продажу"
        description={product.name}
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Цена продажи (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Дата продажи</Label>
              <Input
                type="date"
                value={soldAt}
                onChange={(e) => setSoldAt(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Комиссия площадки (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Доп. расходы на продажу (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={saleExpenses}
                onChange={(e) => setSaleExpenses(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Комментарий</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Опционально"
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Сохранение..." : "Подтвердить продажу"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
