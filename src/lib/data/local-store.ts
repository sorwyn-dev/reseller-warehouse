import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type {
  Box,
  BoxWithProducts,
  CreateBoxInput,
  CreateProductInput,
  CreateSaleInput,
  Product,
  ProductWithSale,
  Sale,
  UpdateBoxInput,
  UpdateProductInput,
} from "@/lib/types";
import { calcUnitCost, nextBoxNumber } from "@/lib/finance";
import { todayISODate } from "@/lib/utils";

interface StoreData {
  boxes: Box[];
  products: Product[];
  sales: Sale[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "store.json");

async function ensureStore(): Promise<StoreData> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    const raw = await fs.readFile(STORE_FILE, "utf8");
    return JSON.parse(raw) as StoreData;
  } catch {
    const empty: StoreData = { boxes: [], products: [], sales: [] };
    await fs.writeFile(STORE_FILE, JSON.stringify(empty, null, 2), "utf8");
    return empty;
  }
}

async function saveStore(data: StoreData): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(data, null, 2), "utf8");
}

function attachSales(
  products: Product[],
  sales: Sale[],
): ProductWithSale[] {
  const salesByProduct = new Map(sales.map((sale) => [sale.product_id, sale]));
  return products.map((product) => ({
    ...product,
    sale: salesByProduct.get(product.id) ?? null,
  }));
}

function toBoxWithProducts(
  box: Box,
  products: Product[],
  sales: Sale[],
): BoxWithProducts {
  const boxProducts = products.filter((product) => product.box_id === box.id);
  return {
    ...box,
    products: attachSales(boxProducts, sales),
  };
}

export async function listBoxes(): Promise<BoxWithProducts[]> {
  const store = await ensureStore();
  return store.boxes
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((box) => toBoxWithProducts(box, store.products, store.sales));
}

export async function getBox(id: string): Promise<BoxWithProducts | null> {
  const store = await ensureStore();
  const box = store.boxes.find((item) => item.id === id);
  if (!box) return null;
  return toBoxWithProducts(box, store.products, store.sales);
}

export async function createBox(input: CreateBoxInput): Promise<BoxWithProducts> {
  const store = await ensureStore();
  const now = new Date().toISOString();
  const box: Box = {
    id: randomUUID(),
    number: nextBoxNumber(store.boxes.map((item) => item.number)),
    received_at: input.received_at || todayISODate(),
    shipping_cost: input.shipping_cost ?? 0,
    additional_expenses: input.additional_expenses ?? 0,
    comment: input.comment ?? null,
    created_at: now,
    updated_at: now,
  };

  store.boxes.unshift(box);
  await saveStore(store);
  return toBoxWithProducts(box, store.products, store.sales);
}

export async function updateBox(
  id: string,
  input: UpdateBoxInput,
): Promise<BoxWithProducts> {
  const store = await ensureStore();
  const index = store.boxes.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Коробка не найдена");

  store.boxes[index] = {
    ...store.boxes[index],
    ...input,
    updated_at: new Date().toISOString(),
  };

  await saveStore(store);
  return toBoxWithProducts(store.boxes[index], store.products, store.sales);
}

export async function deleteBox(id: string): Promise<void> {
  const store = await ensureStore();
  const productIds = new Set(
    store.products.filter((product) => product.box_id === id).map((p) => p.id),
  );

  store.boxes = store.boxes.filter((box) => box.id !== id);
  store.products = store.products.filter((product) => product.box_id !== id);
  store.sales = store.sales.filter((sale) => !productIds.has(sale.product_id));
  await saveStore(store);
}

export async function addProduct(
  boxId: string,
  input: CreateProductInput,
): Promise<ProductWithSale> {
  const store = await ensureStore();
  const box = store.boxes.find((item) => item.id === boxId);
  if (!box) throw new Error("Коробка не найдена");

  const now = new Date().toISOString();
  const product: Product = {
    id: randomUUID(),
    box_id: boxId,
    name: input.name.trim(),
    category: input.category?.trim() || null,
    size: input.size?.trim() || null,
    purchase_price: input.purchase_price,
    photo_url: input.photo_url ?? null,
    status: "in_stock",
    asking_price: input.asking_price ?? null,
    created_at: now,
    updated_at: now,
  };

  store.products.push(product);
  await saveStore(store);
  return { ...product, sale: null };
}

export async function addProducts(
  boxId: string,
  inputs: CreateProductInput[],
): Promise<ProductWithSale[]> {
  const results: ProductWithSale[] = [];
  for (const input of inputs) {
    results.push(await addProduct(boxId, input));
  }
  return results;
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ProductWithSale> {
  const store = await ensureStore();
  const index = store.products.findIndex((item) => item.id === id);
  if (index === -1) throw new Error("Товар не найден");

  const current = store.products[index];
  if (current.status === "sold" && input.purchase_price != null) {
    // закупочную цену проданного можно менять только в карточке до продажи;
    // после продажи история в sales уже зафиксирована
  }

  store.products[index] = {
    ...current,
    ...input,
    name: input.name?.trim() ?? current.name,
    category:
      input.category === undefined
        ? current.category
        : input.category?.trim() || null,
    size: input.size === undefined ? current.size : input.size?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  await saveStore(store);
  const sale = store.sales.find((item) => item.product_id === id) ?? null;
  return { ...store.products[index], sale };
}

export async function deleteProduct(id: string): Promise<void> {
  const store = await ensureStore();
  const product = store.products.find((item) => item.id === id);
  if (!product) throw new Error("Товар не найден");
  if (product.status === "sold") {
    throw new Error("Сначала отмените продажу");
  }

  store.products = store.products.filter((item) => item.id !== id);
  store.sales = store.sales.filter((item) => item.product_id !== id);
  await saveStore(store);
}

export async function sellProduct(
  productId: string,
  input: CreateSaleInput,
): Promise<ProductWithSale> {
  const store = await ensureStore();
  const productIndex = store.products.findIndex((item) => item.id === productId);
  if (productIndex === -1) throw new Error("Товар не найден");

  const product = store.products[productIndex];
  if (product.status === "sold") throw new Error("Товар уже продан");

  const box = store.boxes.find((item) => item.id === product.box_id);
  if (!box) throw new Error("Коробка не найдена");

  const productCount = store.products.filter((item) => item.box_id === box.id)
    .length;
  const cost = calcUnitCost(
    product.purchase_price,
    box.shipping_cost,
    box.additional_expenses,
    productCount,
  );

  const now = new Date().toISOString();
  const sale: Sale = {
    id: randomUUID(),
    product_id: productId,
    sale_price: input.sale_price,
    sold_at: input.sold_at || todayISODate(),
    commission: input.commission ?? 0,
    sale_expenses: input.sale_expenses ?? 0,
    comment: input.comment ?? null,
    frozen_purchase_price: cost.purchasePrice,
    frozen_shipping_share: cost.shippingShare,
    frozen_additional_share: cost.additionalShare,
    frozen_unit_cost: cost.unitCost,
    created_at: now,
  };

  store.sales.push(sale);
  store.products[productIndex] = {
    ...product,
    status: "sold",
    updated_at: now,
  };

  await saveStore(store);
  return { ...store.products[productIndex], sale };
}

export async function cancelSale(productId: string): Promise<ProductWithSale> {
  const store = await ensureStore();
  const productIndex = store.products.findIndex((item) => item.id === productId);
  if (productIndex === -1) throw new Error("Товар не найден");

  store.sales = store.sales.filter((item) => item.product_id !== productId);
  store.products[productIndex] = {
    ...store.products[productIndex],
    status: "in_stock",
    updated_at: new Date().toISOString(),
  };

  await saveStore(store);
  return { ...store.products[productIndex], sale: null };
}
