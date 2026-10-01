"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBoxAction, deleteBoxAction } from "@/lib/actions";
import type { Box } from "@/lib/types";
import { parseNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function BoxSettingsForm({ box }: { box: Box }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [receivedAt, setReceivedAt] = useState(box.received_at);
  const [shippingCost, setShippingCost] = useState(String(box.shipping_cost));
  const [additionalExpenses, setAdditionalExpenses] = useState(
    String(box.additional_expenses),
  );
  const [comment, setComment] = useState(box.comment ?? "");

  function onSave(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        await updateBoxAction(box.id, {
          received_at: receivedAt,
          shipping_cost: parseNumber(shippingCost),
          additional_expenses: parseNumber(additionalExpenses),
          comment: comment.trim() || null,
        });
        setMessage("Сохранено. Себестоимость непроданных вещей пересчитана.");
        router.refresh();
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Ошибка сохранения");
      }
    });
  }

  function onDelete() {
    if (!confirm(`Удалить коробку ${box.number} и все её товары?`)) return;

    startTransition(async () => {
      await deleteBoxAction(box.id);
      router.push("/");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Параметры коробки</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Дата поступления</Label>
            <Input
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Доставка (€)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Доп. расходы (€)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={additionalExpenses}
              onChange={(e) => setAdditionalExpenses(e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Комментарий</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          {message ? (
            <p className="text-sm text-slate-600 sm:col-span-2">{message}</p>
          ) : null}
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Сохранение..." : "Сохранить"}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={onDelete}
            >
              Удалить коробку
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
