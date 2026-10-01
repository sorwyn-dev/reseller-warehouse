export type ProductStatus = "in_stock" | "sold";

export interface Box {
  id: string;
  number: string;
  received_at: string;
  shipping_cost: number;
  additional_expenses: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  box_id: string;
  name: string;
  category: string | null;
  size: string | null;
  purchase_price: number;
  photo_url: string | null;
  status: ProductStatus;
  asking_price: number | null;
  created_at: string;
  updated_at: string;
}

export interface Sale {
  id: string;
  product_id: string;
  sale_price: number;
  sold_at: string;
  commission: number;
  sale_expenses: number;
  comment: string | null;
  frozen_purchase_price: number;
  frozen_shipping_share: number;
  frozen_additional_share: number;
  frozen_unit_cost: number;
  created_at: string;
}

export interface ProductWithSale extends Product {
  sale: Sale | null;
}

export interface BoxWithProducts extends Box {
  products: ProductWithSale[];
}

export interface CreateBoxInput {
  received_at: string;
  shipping_cost?: number;
  additional_expenses?: number;
  comment?: string | null;
}

export interface UpdateBoxInput {
  received_at?: string;
  shipping_cost?: number;
  additional_expenses?: number;
  comment?: string | null;
}

export interface CreateProductInput {
  name: string;
  category?: string | null;
  size?: string | null;
  purchase_price: number;
  photo_url?: string | null;
  asking_price?: number | null;
}

export interface UpdateProductInput {
  name?: string;
  category?: string | null;
  size?: string | null;
  purchase_price?: number;
  photo_url?: string | null;
  asking_price?: number | null;
}

export interface CreateSaleInput {
  sale_price: number;
  sold_at: string;
  commission?: number;
  sale_expenses?: number;
  comment?: string | null;
}

export interface UnitCostBreakdown {
  purchasePrice: number;
  shippingShare: number;
  additionalShare: number;
  unitCost: number;
}

export interface ProductFinance {
  productId: string;
  status: ProductStatus;
  currentCost: UnitCostBreakdown;
  effectiveCost: UnitCostBreakdown;
  salePrice: number | null;
  commission: number;
  saleExpenses: number;
  profit: number | null;
}

export interface BoxFinance {
  productCount: number;
  soldCount: number;
  remainingCount: number;
  purchaseTotal: number;
  shippingCost: number;
  additionalExpenses: number;
  totalCost: number;
  revenue: number;
  soldCost: number;
  soldPurchaseTotal: number;
  soldShippingShare: number;
  soldAdditionalShare: number;
  saleCommissions: number;
  saleExtraExpenses: number;
  saleExpensesTotal: number;
  netProfit: number;
  investedInUnsold: number;
  potentialRevenue: number;
}

export interface DashboardStats {
  boxCount: number;
  stockCount: number;
  totalRevenue: number;
  totalNetProfit: number;
}
