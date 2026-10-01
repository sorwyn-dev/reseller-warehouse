"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { addProductAction } from "@/lib/actions";
import { parseNumber } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddProductButton({ boxId }: { boxId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [askingPrice, setAskingPrice] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  function reset() {
    setName("");
    setCategory("");
    setSize("");
    setPurchasePrice("");
    setAskingPrice("");
    setPhotoUrl(null);
    setError(null);
  }

  function onPhotoChange(file: File | null) {
    if (!file) {
      setPhotoUrl(null);
      return;
    }
    if (file.size > 1_500_000) {
      setError("Фото слишком большое. Используйте файл до 1.5 МБ.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Укажите название");
      return;
    }

    startTransition(async () => {
      try {
        await addProductAction(boxId, {
          name,
          category: category || null,
          size: size || null,
          purchase_price: parseNumber(purchasePrice),
          asking_price: askingPrice ? parseNumber(askingPrice) : null,
          photo_url: photoUrl,
        });
        setOpen(false);
        reset();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Не удалось добавить товар");
      }
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Добавить вещь
      </Button>

      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) reset();
        }}
        title="Добавить вещь"
        description="Себестоимость пересчитается с учётом доставки коробки."
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Название</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Категория</Label>
              <Input value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Размер</Label>
              <Input value={size} onChange={(e) => setSize(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Закупочная цена (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Планируемая цена (€)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={askingPrice}
                onChange={(e) => setAskingPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Фотография</Label>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => onPhotoChange(e.target.files?.[0] ?? null)}
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Сохранение..." : "Добавить"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
