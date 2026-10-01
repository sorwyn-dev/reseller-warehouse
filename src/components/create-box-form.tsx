"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { createBoxAction, addProductsAction } from "@/lib/actions";
import { parseNumber, todayISODate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DraftProduct {
  key: string;
  name: string;
  category: string;
  size: string;
  purchase_price: string;
  asking_price: string;
  photo_url: string;
}

function emptyProduct(): DraftProduct {
  return {
    key: crypto.randomUUID(),
    name: "",
    category: "",
    size: "",
    purchase_price: "",
    asking_price: "",
    photo_url: "",
  };
}

export function CreateBoxForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [receivedAt, setReceivedAt] = useState(todayISODate());
  const [shippingCost, setShippingCost] = useState("0");
  const [additionalExpenses, setAdditionalExpenses] = useState("0");
  const [comment, setComment] = useState("");
  const [products, setProducts] = useState<DraftProduct[]>([emptyProduct()]);

  const previewCost = useMemo(() => {
    const count = products.filter((p) => p.name.trim()).length || products.length;
    const shipping = parseNumber(shippingCost);
    const extra = parseNumber(additionalExpenses);
    const share = count > 0 ? (shipping + extra) / count : 0;
    return share;
  }, [products, shippingCost, additionalExpenses]);

  function updateProduct(key: string, patch: Partial<DraftProduct>) {
    setProducts((current) =>
      current.map((product) =>
        product.key === key ? { ...product, ...patch } : product,
      ),
    );
  }

  function removeProduct(key: string) {
    setProducts((current) =>
      current.length === 1 ? current : current.filter((p) => p.key !== key),
    );
  }

  async function onPhotoChange(key: string, file: File | null) {
    if (!file) {
      updateProduct(key, { photo_url: "" });
      return;
    }

    if (file.size > 1_500_000) {
      setError("Фото слишком большое. Используйте файл до 1.5 МБ.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      updateProduct(key, { photo_url: String(reader.result || "") });
    };
    reader.readAsDataURL(file);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const validProducts = products.filter((product) => product.name.trim());
    if (validProducts.length === 0) {
      setError("Добавьте хотя бы одну вещь с названием.");
      return;
    }

    startTransition(async () => {
      try {
        const box = await createBoxAction({
          received_at: receivedAt,
          shipping_cost: parseNumber(shippingCost),
          additional_expenses: parseNumber(additionalExpenses),
          comment: comment.trim() || null,
        });

        await addProductsAction(
          box.id,
          validProducts.map((product) => ({
            name: product.name,
            category: product.category || null,
            size: product.size || null,
            purchase_price: parseNumber(product.purchase_price),
            asking_price: product.asking_price
              ? parseNumber(product.asking_price)
              : null,
            photo_url: product.photo_url || null,
          })),
        );

        router.push(`/boxes/${box.id}`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось создать коробку");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Новая коробка</CardTitle>
          <p className="text-sm text-slate-500">
            Номер коробки будет сгенерирован автоматически.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="received_at">Дата поступления</Label>
            <Input
              id="received_at"
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="shipping_cost">Стоимость доставки (€)</Label>
            <Input
              id="shipping_cost"
              type="number"
              min="0"
              step="0.01"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="additional_expenses">Дополнительные расходы (€)</Label>
            <Input
              id="additional_expenses"
              type="number"
              min="0"
              step="0.01"
              value={additionalExpenses}
              onChange={(e) => setAdditionalExpenses(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Опционально"
            />
          </div>
          <p className="text-sm text-slate-500 sm:col-span-2">
            Доля доставки и доп. расходов на вещь сейчас ≈{" "}
            <span className="font-medium text-slate-800">
              {previewCost.toFixed(2)} €
            </span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Вещи в коробке</CardTitle>
            <p className="mt-1 text-sm text-slate-500">
              Добавляйте товары поштучно. У каждой вещи будет свой ID.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setProducts((current) => [...current, emptyProduct()])}
          >
            <Plus className="h-4 w-4" />
            Добавить ещё одну вещь
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {products.map((product, index) => (
            <div
              key={product.key}
              className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700">
                  Вещь {index + 1}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeProduct(product.key)}
                  disabled={products.length === 1}
                >
                  <Trash2 className="h-4 w-4" />
                  Удалить
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Название</Label>
                  <Input
                    value={product.name}
                    onChange={(e) =>
                      updateProduct(product.key, { name: e.target.value })
                    }
                    placeholder="Например, Nike Air Max"
                    required={index === 0}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Категория</Label>
                  <Input
                    value={product.category}
                    onChange={(e) =>
                      updateProduct(product.key, { category: e.target.value })
                    }
                    placeholder="Опционально"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Размер</Label>
                  <Input
                    value={product.size}
                    onChange={(e) =>
                      updateProduct(product.key, { size: e.target.value })
                    }
                    placeholder="Опционально"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Закупочная цена (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={product.purchase_price}
                    onChange={(e) =>
                      updateProduct(product.key, {
                        purchase_price: e.target.value,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Планируемая цена продажи (€)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={product.asking_price}
                    onChange={(e) =>
                      updateProduct(product.key, {
                        asking_price: e.target.value,
                      })
                    }
                    placeholder="Опционально"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Фотография</Label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      onPhotoChange(product.key, e.target.files?.[0] ?? null)
                    }
                  />
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/")}
          disabled={isPending}
        >
          Отмена
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Сохранение..." : "Создать коробку"}
        </Button>
      </div>
    </form>
  );
}
