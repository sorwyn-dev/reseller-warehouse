import { describe, expect, it } from "vitest";
import {
  calcBoxFinance,
  calcDashboardStats,
  calcMonthlyStats,
  calcProductProfit,
  calcUnitCost,
  getEffectiveCost,
  nextBoxNumber,
} from "@/lib/finance";
import type { Box, ProductWithSale, Sale } from "@/lib/types";

function makeBox(overrides: Partial<Box> = {}): Box {
  return {
    id: "box-1",
    number: "BOX-001",
    received_at: "2026-01-01",
    shipping_cost: 20,
    additional_expenses: 10,
    comment: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeProduct(
  overrides: Partial<ProductWithSale> & { id: string; purchase_price: number },
): ProductWithSale {
  return {
    box_id: "box-1",
    name: "Товар",
    category: null,
    size: null,
    photo_url: null,
    status: "in_stock",
    asking_price: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    sale: null,
    ...overrides,
  };
}

function makeSale(overrides: Partial<Sale> & { product_id: string }): Sale {
  return {
    id: `sale-${overrides.product_id}`,
    sale_price: 50,
    sold_at: "2026-01-10",
    commission: 0,
    sale_expenses: 0,
    comment: null,
    frozen_purchase_price: 10,
    frozen_shipping_share: 5,
    frozen_additional_share: 2.5,
    frozen_unit_cost: 17.5,
    created_at: "2026-01-10T00:00:00.000Z",
    ...overrides,
  };
}

describe("calcUnitCost", () => {
  it("распределяет доставку и доп. расходы поровну", () => {
    expect(calcUnitCost(10, 20, 10, 4)).toEqual({
      purchasePrice: 10,
      shippingShare: 5,
      additionalShare: 2.5,
      unitCost: 17.5,
    });
  });

  it("возвращает только закупочную цену без вещей", () => {
    expect(calcUnitCost(15, 20, 10, 0)).toEqual({
      purchasePrice: 15,
      shippingShare: 0,
      additionalShare: 0,
      unitCost: 15,
    });
  });
});

describe("getEffectiveCost", () => {
  it("для проданных вещей использует замороженную себестоимость", () => {
    const box = makeBox({ shipping_cost: 100, additional_expenses: 100 });
    const product = makeProduct({
      id: "p1",
      purchase_price: 10,
      status: "sold",
      sale: makeSale({
        product_id: "p1",
        frozen_purchase_price: 10,
        frozen_shipping_share: 5,
        frozen_additional_share: 2.5,
        frozen_unit_cost: 17.5,
      }),
    });

    expect(getEffectiveCost(product, box, 2)).toEqual({
      purchasePrice: 10,
      shippingShare: 5,
      additionalShare: 2.5,
      unitCost: 17.5,
    });
  });

  it("для непроданных вещей пересчитывает текущую себестоимость", () => {
    const box = makeBox({ shipping_cost: 30, additional_expenses: 0 });
    const product = makeProduct({ id: "p1", purchase_price: 20 });

    expect(getEffectiveCost(product, box, 3)).toEqual({
      purchasePrice: 20,
      shippingShare: 10,
      additionalShare: 0,
      unitCost: 30,
    });
  });
});

describe("calcBoxFinance", () => {
  it("считает выручку, себестоимость проданных и чистую прибыль", () => {
    const box = makeBox({ shipping_cost: 20, additional_expenses: 10 });
    const products: ProductWithSale[] = [
      makeProduct({
        id: "p1",
        purchase_price: 10,
        status: "sold",
        sale: makeSale({
          product_id: "p1",
          sale_price: 40,
          commission: 4,
          sale_expenses: 1,
          frozen_purchase_price: 10,
          frozen_shipping_share: 5,
          frozen_additional_share: 2.5,
          frozen_unit_cost: 17.5,
        }),
      }),
      makeProduct({
        id: "p2",
        purchase_price: 20,
        status: "sold",
        sale: makeSale({
          product_id: "p2",
          sale_price: 60,
          commission: 6,
          sale_expenses: 0,
          frozen_purchase_price: 20,
          frozen_shipping_share: 5,
          frozen_additional_share: 2.5,
          frozen_unit_cost: 27.5,
        }),
      }),
      makeProduct({
        id: "p3",
        purchase_price: 15,
        asking_price: 45,
      }),
      makeProduct({
        id: "p4",
        purchase_price: 25,
        asking_price: null,
      }),
    ];

    const finance = calcBoxFinance(box, products);

    expect(finance.productCount).toBe(4);
    expect(finance.soldCount).toBe(2);
    expect(finance.remainingCount).toBe(2);
    expect(finance.purchaseTotal).toBe(70);
    expect(finance.totalCost).toBe(100);
    expect(finance.revenue).toBe(100);
    expect(finance.soldCost).toBe(45);
    expect(finance.soldPurchaseTotal).toBe(30);
    expect(finance.soldShippingShare).toBe(10);
    expect(finance.soldAdditionalShare).toBe(5);
    expect(finance.saleCommissions).toBe(10);
    expect(finance.saleExtraExpenses).toBe(1);
    expect(finance.saleExpensesTotal).toBe(11);
    // 100 - 45 - 11 = 44
    expect(finance.netProfit).toBe(44);
    // непроданные: (15+5+2.5) + (25+5+2.5) = 22.5 + 32.5 = 55
    expect(finance.investedInUnsold).toBe(55);
    expect(finance.potentialRevenue).toBe(45);
  });

  it("не включает себестоимость непроданных в расходы по продажам", () => {
    const box = makeBox({ shipping_cost: 0, additional_expenses: 0 });
    const products: ProductWithSale[] = [
      makeProduct({
        id: "p1",
        purchase_price: 10,
        status: "sold",
        sale: makeSale({
          product_id: "p1",
          sale_price: 30,
          frozen_purchase_price: 10,
          frozen_shipping_share: 0,
          frozen_additional_share: 0,
          frozen_unit_cost: 10,
        }),
      }),
      makeProduct({ id: "p2", purchase_price: 1000 }),
    ];

    const finance = calcBoxFinance(box, products);
    expect(finance.soldCost).toBe(10);
    expect(finance.netProfit).toBe(20);
    expect(finance.investedInUnsold).toBe(1000);
  });

  it("сохраняет историю продаж при изменении доставки", () => {
    const boxBefore = makeBox({ shipping_cost: 20, additional_expenses: 0 });
    const sold = makeProduct({
      id: "p1",
      purchase_price: 10,
      status: "sold",
      sale: makeSale({
        product_id: "p1",
        sale_price: 40,
        frozen_purchase_price: 10,
        frozen_shipping_share: 10,
        frozen_additional_share: 0,
        frozen_unit_cost: 20,
      }),
    });
    const unsold = makeProduct({ id: "p2", purchase_price: 10 });

    const before = calcBoxFinance(boxBefore, [sold, unsold]);
    expect(before.netProfit).toBe(20);
    expect(before.investedInUnsold).toBe(20);

    const boxAfter = makeBox({ shipping_cost: 100, additional_expenses: 0 });
    const after = calcBoxFinance(boxAfter, [sold, unsold]);

    expect(after.soldCost).toBe(20);
    expect(after.netProfit).toBe(20);
    expect(after.investedInUnsold).toBe(60);
  });
});

describe("calcProductProfit", () => {
  it("считает прибыль вещи с комиссией и расходами", () => {
    const product = makeProduct({
      id: "p1",
      purchase_price: 10,
      status: "sold",
      sale: makeSale({
        product_id: "p1",
        sale_price: 50,
        commission: 5,
        sale_expenses: 2,
        frozen_unit_cost: 17.5,
      }),
    });

    expect(calcProductProfit(product)).toBe(25.5);
  });
});

describe("calcDashboardStats", () => {
  it("суммирует показатели по всем коробкам", () => {
    const box = makeBox({ shipping_cost: 0, additional_expenses: 0 });
    const stats = calcDashboardStats([
      {
        box,
        products: [
          makeProduct({
            id: "p1",
            purchase_price: 10,
            status: "sold",
            sale: makeSale({
              product_id: "p1",
              sale_price: 30,
              frozen_unit_cost: 10,
              frozen_purchase_price: 10,
              frozen_shipping_share: 0,
              frozen_additional_share: 0,
            }),
          }),
          makeProduct({ id: "p2", purchase_price: 10 }),
        ],
      },
      {
        box: makeBox({ id: "box-2" }),
        products: [makeProduct({ id: "p3", box_id: "box-2", purchase_price: 5 })],
      },
    ]);

    expect(stats.boxCount).toBe(2);
    expect(stats.stockCount).toBe(2);
    expect(stats.totalRevenue).toBe(30);
    expect(stats.totalNetProfit).toBe(20);
  });
});

describe("calcMonthlyStats", () => {
  it("группирует выручку и прибыль по месяцу продажи", () => {
    const january = makeBox({
      id: "box-1",
      received_at: "2026-01-15",
      shipping_cost: 0,
      additional_expenses: 0,
    });
    const february = makeBox({
      id: "box-2",
      received_at: "2026-02-01",
      shipping_cost: 10,
      additional_expenses: 0,
    });

    const months = calcMonthlyStats([
      {
        box: january,
        products: [
          makeProduct({
            id: "p1",
            purchase_price: 10,
            status: "sold",
            sale: makeSale({
              product_id: "p1",
              sale_price: 40,
              sold_at: "2026-01-20",
              commission: 4,
              sale_expenses: 1,
              frozen_unit_cost: 10,
              frozen_purchase_price: 10,
              frozen_shipping_share: 0,
              frozen_additional_share: 0,
            }),
          }),
          makeProduct({
            id: "p2",
            purchase_price: 20,
            status: "sold",
            sale: makeSale({
              product_id: "p2",
              sale_price: 50,
              sold_at: "2026-02-05",
              frozen_unit_cost: 20,
              frozen_purchase_price: 20,
              frozen_shipping_share: 0,
              frozen_additional_share: 0,
            }),
          }),
        ],
      },
      {
        box: february,
        products: [makeProduct({ id: "p3", box_id: "box-2", purchase_price: 15 })],
      },
    ]);

    expect(months.map((m) => m.key)).toEqual(["2026-02", "2026-01"]);

    const feb = months.find((m) => m.key === "2026-02")!;
    expect(feb.revenue).toBe(50);
    expect(feb.netProfit).toBe(30);
    expect(feb.soldCount).toBe(1);
    expect(feb.boxesReceived).toBe(1);
    expect(feb.purchaseInvested).toBe(25);

    const jan = months.find((m) => m.key === "2026-01")!;
    expect(jan.revenue).toBe(40);
    expect(jan.saleExpensesTotal).toBe(5);
    expect(jan.netProfit).toBe(25);
    expect(jan.soldCount).toBe(1);
    expect(jan.boxesReceived).toBe(1);
    expect(jan.purchaseInvested).toBe(30);
  });
});

describe("nextBoxNumber", () => {
  it("генерирует следующий номер коробки", () => {
    expect(nextBoxNumber([])).toBe("BOX-001");
    expect(nextBoxNumber(["BOX-001", "BOX-003"])).toBe("BOX-004");
  });
});
