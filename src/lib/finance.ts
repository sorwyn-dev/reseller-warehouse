import type {
  Box,
  BoxFinance,
  DashboardStats,
  ProductFinance,
  ProductWithSale,
  UnitCostBreakdown,
} from "@/lib/types";
import { roundMoney } from "@/lib/utils";

export function calcShares(
  shippingCost: number,
  additionalExpenses: number,
  productCount: number,
): { shippingShare: number; additionalShare: number } {
  if (productCount <= 0) {
    return { shippingShare: 0, additionalShare: 0 };
  }

  return {
    shippingShare: roundMoney(shippingCost / productCount),
    additionalShare: roundMoney(additionalExpenses / productCount),
  };
}

export function calcUnitCost(
  purchasePrice: number,
  shippingCost: number,
  additionalExpenses: number,
  productCount: number,
): UnitCostBreakdown {
  const { shippingShare, additionalShare } = calcShares(
    shippingCost,
    additionalExpenses,
    productCount,
  );

  return {
    purchasePrice: roundMoney(purchasePrice),
    shippingShare,
    additionalShare,
    unitCost: roundMoney(purchasePrice + shippingShare + additionalShare),
  };
}

export function getEffectiveCost(
  product: ProductWithSale,
  box: Pick<Box, "shipping_cost" | "additional_expenses">,
  productCount: number,
): UnitCostBreakdown {
  if (product.status === "sold" && product.sale) {
    return {
      purchasePrice: roundMoney(product.sale.frozen_purchase_price),
      shippingShare: roundMoney(product.sale.frozen_shipping_share),
      additionalShare: roundMoney(product.sale.frozen_additional_share),
      unitCost: roundMoney(product.sale.frozen_unit_cost),
    };
  }

  return calcUnitCost(
    product.purchase_price,
    box.shipping_cost,
    box.additional_expenses,
    productCount,
  );
}

export function calcProductProfit(product: ProductWithSale): number | null {
  if (product.status !== "sold" || !product.sale) return null;

  return roundMoney(
    product.sale.sale_price -
      product.sale.frozen_unit_cost -
      product.sale.commission -
      product.sale.sale_expenses,
  );
}

export function calcProductFinance(
  product: ProductWithSale,
  box: Pick<Box, "shipping_cost" | "additional_expenses">,
  productCount: number,
): ProductFinance {
  const currentCost = calcUnitCost(
    product.purchase_price,
    box.shipping_cost,
    box.additional_expenses,
    productCount,
  );
  const effectiveCost = getEffectiveCost(product, box, productCount);
  const profit = calcProductProfit(product);

  return {
    productId: product.id,
    status: product.status,
    currentCost,
    effectiveCost,
    salePrice: product.sale?.sale_price ?? null,
    commission: product.sale?.commission ?? 0,
    saleExpenses: product.sale?.sale_expenses ?? 0,
    profit,
  };
}

export function calcBoxFinance(
  box: Pick<Box, "shipping_cost" | "additional_expenses">,
  products: ProductWithSale[],
): BoxFinance {
  const productCount = products.length;
  const soldProducts = products.filter((p) => p.status === "sold" && p.sale);
  const remainingProducts = products.filter((p) => p.status === "in_stock");

  const purchaseTotal = roundMoney(
    products.reduce((sum, p) => sum + p.purchase_price, 0),
  );
  const shippingCost = roundMoney(box.shipping_cost);
  const additionalExpenses = roundMoney(box.additional_expenses);
  const totalCost = roundMoney(purchaseTotal + shippingCost + additionalExpenses);

  let revenue = 0;
  let soldCost = 0;
  let soldPurchaseTotal = 0;
  let soldShippingShare = 0;
  let soldAdditionalShare = 0;
  let saleCommissions = 0;
  let saleExtraExpenses = 0;

  for (const product of soldProducts) {
    const sale = product.sale!;
    revenue += sale.sale_price;
    soldCost += sale.frozen_unit_cost;
    soldPurchaseTotal += sale.frozen_purchase_price;
    soldShippingShare += sale.frozen_shipping_share;
    soldAdditionalShare += sale.frozen_additional_share;
    saleCommissions += sale.commission;
    saleExtraExpenses += sale.sale_expenses;
  }

  revenue = roundMoney(revenue);
  soldCost = roundMoney(soldCost);
  soldPurchaseTotal = roundMoney(soldPurchaseTotal);
  soldShippingShare = roundMoney(soldShippingShare);
  soldAdditionalShare = roundMoney(soldAdditionalShare);
  saleCommissions = roundMoney(saleCommissions);
  saleExtraExpenses = roundMoney(saleExtraExpenses);
  const saleExpensesTotal = roundMoney(saleCommissions + saleExtraExpenses);
  const netProfit = roundMoney(revenue - soldCost - saleExpensesTotal);

  const investedInUnsold = roundMoney(
    remainingProducts.reduce((sum, product) => {
      return (
        sum +
        calcUnitCost(
          product.purchase_price,
          box.shipping_cost,
          box.additional_expenses,
          productCount,
        ).unitCost
      );
    }, 0),
  );

  const potentialRevenue = roundMoney(
    remainingProducts.reduce((sum, product) => {
      return sum + (product.asking_price ?? 0);
    }, 0),
  );

  return {
    productCount,
    soldCount: soldProducts.length,
    remainingCount: remainingProducts.length,
    purchaseTotal,
    shippingCost,
    additionalExpenses,
    totalCost,
    revenue,
    soldCost,
    soldPurchaseTotal,
    soldShippingShare,
    soldAdditionalShare,
    saleCommissions,
    saleExtraExpenses,
    saleExpensesTotal,
    netProfit,
    investedInUnsold,
    potentialRevenue,
  };
}

export function calcDashboardStats(
  boxes: Array<{
    box: Pick<Box, "shipping_cost" | "additional_expenses">;
    products: ProductWithSale[];
  }>,
): DashboardStats {
  let stockCount = 0;
  let totalRevenue = 0;
  let totalNetProfit = 0;

  for (const item of boxes) {
    const finance = calcBoxFinance(item.box, item.products);
    stockCount += finance.remainingCount;
    totalRevenue += finance.revenue;
    totalNetProfit += finance.netProfit;
  }

  return {
    boxCount: boxes.length,
    stockCount,
    totalRevenue: roundMoney(totalRevenue),
    totalNetProfit: roundMoney(totalNetProfit),
  };
}

export function nextBoxNumber(existingNumbers: string[]): string {
  let max = 0;

  for (const number of existingNumbers) {
    const match = number.match(/(\d+)\s*$/);
    if (match) {
      max = Math.max(max, Number(match[1]));
    }
  }

  return `BOX-${String(max + 1).padStart(3, "0")}`;
}
