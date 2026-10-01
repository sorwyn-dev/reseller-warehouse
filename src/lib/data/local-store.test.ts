import { afterEach, describe, expect, it } from "vitest";
import {
  addProducts,
  cancelSale,
  createBox,
  deleteBox,
  getBox,
  listBoxes,
  sellProduct,
  updateBox,
} from "@/lib/data/local-store";
import { calcBoxFinance } from "@/lib/finance";

async function clearStore() {
  const boxes = await listBoxes();
  for (const box of boxes) {
    await deleteBox(box.id);
  }
}

describe("warehouse scenarios", () => {
  afterEach(async () => {
    await clearStore();
  });

  it("создаёт коробку, продаёт вещи и считает прибыль", async () => {
    await clearStore();

    const box = await createBox({
      received_at: "2026-03-01",
      shipping_cost: 20,
      additional_expenses: 10,
    });

    await addProducts(box.id, [
      { name: "A", purchase_price: 10 },
      { name: "B", purchase_price: 20 },
      { name: "C", purchase_price: 15, asking_price: 45 },
      { name: "D", purchase_price: 25 },
    ]);

    let full = await getBox(box.id);
    expect(full?.products).toHaveLength(4);

    await sellProduct(full!.products[0].id, {
      sale_price: 40,
      sold_at: "2026-03-10",
      commission: 4,
      sale_expenses: 1,
    });
    await sellProduct(full!.products[1].id, {
      sale_price: 60,
      sold_at: "2026-03-11",
      commission: 6,
      sale_expenses: 0,
    });

    full = await getBox(box.id);
    let finance = calcBoxFinance(full!, full!.products);

    expect(finance.revenue).toBe(100);
    expect(finance.soldCost).toBe(45);
    expect(finance.netProfit).toBe(44);
    expect(finance.investedInUnsold).toBe(55);
    expect(finance.potentialRevenue).toBe(45);

    await updateBox(box.id, { shipping_cost: 100 });
    full = await getBox(box.id);
    finance = calcBoxFinance(full!, full!.products);

    // история продаж не меняется
    expect(finance.soldCost).toBe(45);
    expect(finance.netProfit).toBe(44);
    // непроданные пересчитались: (15+25+2.5) + (25+25+2.5) = 42.5 + 52.5 = 95
    expect(finance.investedInUnsold).toBe(95);

    await cancelSale(full!.products[0].id);
    full = await getBox(box.id);
    finance = calcBoxFinance(full!, full!.products);

    expect(finance.soldCount).toBe(1);
    expect(finance.remainingCount).toBe(3);
    expect(finance.revenue).toBe(60);
  });
});
