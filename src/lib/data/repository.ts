import { isSupabaseConfigured } from "@/lib/supabase/client";
import { createClient } from "@/utils/supabase/server";
import { calcUnitCost, nextBoxNumber } from "@/lib/finance";
import { todayISODate } from "@/lib/utils";
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
import * as local from "@/lib/data/local-store";

async function getSupabase() {
  if (!isSupabaseConfigured()) return null;
  return createClient();
}

function mapSale(row: Record<string, unknown>): Sale {
  return {
    id: String(row.id),
    product_id: String(row.product_id),
    sale_price: Number(row.sale_price),
    sold_at: String(row.sold_at),
    commission: Number(row.commission),
    sale_expenses: Number(row.sale_expenses),
    comment: (row.comment as string | null) ?? null,
    frozen_purchase_price: Number(row.frozen_purchase_price),
    frozen_shipping_share: Number(row.frozen_shipping_share),
    frozen_additional_share: Number(row.frozen_additional_share),
    frozen_unit_cost: Number(row.frozen_unit_cost),
    created_at: String(row.created_at),
  };
}

function mapProduct(row: Record<string, unknown>, sale: Sale | null = null): ProductWithSale {
  return {
    id: String(row.id),
    box_id: String(row.box_id),
    name: String(row.name),
    category: (row.category as string | null) ?? null,
    size: (row.size as string | null) ?? null,
    purchase_price: Number(row.purchase_price),
    photo_url: (row.photo_url as string | null) ?? null,
    status: row.status as Product["status"],
    asking_price:
      row.asking_price == null ? null : Number(row.asking_price),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    sale,
  };
}

function mapBox(row: Record<string, unknown>, products: ProductWithSale[] = []): BoxWithProducts {
  return {
    id: String(row.id),
    number: String(row.number),
    received_at: String(row.received_at),
    shipping_cost: Number(row.shipping_cost),
    additional_expenses: Number(row.additional_expenses),
    comment: (row.comment as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    products,
  };
}

async function fetchBoxWithProducts(boxId: string): Promise<BoxWithProducts | null> {
  const supabase = await getSupabase();
  if (!supabase) return local.getBox(boxId);

  const { data: box, error } = await supabase
    .from("boxes")
    .select("*")
    .eq("id", boxId)
    .maybeSingle();

  if (error) throw error;
  if (!box) return null;

  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*")
    .eq("box_id", boxId)
    .order("created_at", { ascending: true });

  if (productsError) throw productsError;

  const productIds = (products ?? []).map((product) => product.id);
  let sales: Sale[] = [];

  if (productIds.length > 0) {
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("*")
      .in("product_id", productIds);

    if (salesError) throw salesError;
    sales = (salesData ?? []).map(mapSale);
  }

  const salesByProduct = new Map(sales.map((sale) => [sale.product_id, sale]));

  return mapBox(
    box,
    (products ?? []).map((product) =>
      mapProduct(product, salesByProduct.get(product.id) ?? null),
    ),
  );
}

export async function listBoxes(): Promise<BoxWithProducts[]> {
  const supabase = await getSupabase();
  if (!supabase) return local.listBoxes();

  const { data: boxes, error } = await supabase
    .from("boxes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  if (!boxes?.length) return [];

  const boxIds = boxes.map((box) => box.id);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("*")
    .in("box_id", boxIds);

  if (productsError) throw productsError;

  const productIds = (products ?? []).map((product) => product.id);
  let sales: Sale[] = [];

  if (productIds.length > 0) {
    const { data: salesData, error: salesError } = await supabase
      .from("sales")
      .select("*")
      .in("product_id", productIds);

    if (salesError) throw salesError;
    sales = (salesData ?? []).map(mapSale);
  }

  const salesByProduct = new Map(sales.map((sale) => [sale.product_id, sale]));
  const productsByBox = new Map<string, ProductWithSale[]>();

  for (const product of products ?? []) {
    const list = productsByBox.get(product.box_id) ?? [];
    list.push(mapProduct(product, salesByProduct.get(product.id) ?? null));
    productsByBox.set(product.box_id, list);
  }

  return boxes.map((box) => mapBox(box, productsByBox.get(box.id) ?? []));
}

export async function getBox(id: string): Promise<BoxWithProducts | null> {
  return fetchBoxWithProducts(id);
}

export async function createBox(input: CreateBoxInput): Promise<BoxWithProducts> {
  const supabase = await getSupabase();
  if (!supabase) return local.createBox(input);

  const { data: existing, error: existingError } = await supabase
    .from("boxes")
    .select("number");

  if (existingError) throw existingError;

  const number = nextBoxNumber((existing ?? []).map((item) => item.number));
  const { data, error } = await supabase
    .from("boxes")
    .insert({
      number,
      received_at: input.received_at || todayISODate(),
      shipping_cost: input.shipping_cost ?? 0,
      additional_expenses: input.additional_expenses ?? 0,
      comment: input.comment ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapBox(data, []);
}

export async function updateBox(
  id: string,
  input: UpdateBoxInput,
): Promise<BoxWithProducts> {
  const supabase = await getSupabase();
  if (!supabase) return local.updateBox(id, input);

  const { error } = await supabase.from("boxes").update(input).eq("id", id);
  if (error) throw error;

  const box = await fetchBoxWithProducts(id);
  if (!box) throw new Error("Коробка не найдена");
  return box;
}

export async function deleteBox(id: string): Promise<void> {
  const supabase = await getSupabase();
  if (!supabase) return local.deleteBox(id);

  const { error } = await supabase.from("boxes").delete().eq("id", id);
  if (error) throw error;
}

export async function addProduct(
  boxId: string,
  input: CreateProductInput,
): Promise<ProductWithSale> {
  const supabase = await getSupabase();
  if (!supabase) return local.addProduct(boxId, input);

  const { data, error } = await supabase
    .from("products")
    .insert({
      box_id: boxId,
      name: input.name.trim(),
      category: input.category?.trim() || null,
      size: input.size?.trim() || null,
      purchase_price: input.purchase_price,
      photo_url: input.photo_url ?? null,
      asking_price: input.asking_price ?? null,
      status: "in_stock",
    })
    .select("*")
    .single();

  if (error) throw error;
  return mapProduct(data, null);
}

export async function addProducts(
  boxId: string,
  inputs: CreateProductInput[],
): Promise<ProductWithSale[]> {
  const supabase = await getSupabase();
  if (!supabase) return local.addProducts(boxId, inputs);

  const payload = inputs.map((input) => ({
    box_id: boxId,
    name: input.name.trim(),
    category: input.category?.trim() || null,
    size: input.size?.trim() || null,
    purchase_price: input.purchase_price,
    photo_url: input.photo_url ?? null,
    asking_price: input.asking_price ?? null,
    status: "in_stock",
  }));

  const { data, error } = await supabase
    .from("products")
    .insert(payload)
    .select("*");

  if (error) throw error;
  return (data ?? []).map((row) => mapProduct(row, null));
}

export async function updateProduct(
  id: string,
  input: UpdateProductInput,
): Promise<ProductWithSale> {
  const supabase = await getSupabase();
  if (!supabase) return local.updateProduct(id, input);

  const { error } = await supabase.from("products").update(input).eq("id", id);
  if (error) throw error;

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (productError) throw productError;

  const { data: sale } = await supabase
    .from("sales")
    .select("*")
    .eq("product_id", id)
    .maybeSingle();

  return mapProduct(product, sale ? mapSale(sale) : null);
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = await getSupabase();
  if (!supabase) return local.deleteProduct(id);

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("status")
    .eq("id", id)
    .single();

  if (productError) throw productError;
  if (product.status === "sold") throw new Error("Сначала отмените продажу");

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw error;
}

export async function sellProduct(
  productId: string,
  input: CreateSaleInput,
): Promise<ProductWithSale> {
  const supabase = await getSupabase();
  if (!supabase) return local.sellProduct(productId, input);

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .single();

  if (productError) throw productError;
  if (product.status === "sold") throw new Error("Товар уже продан");

  const { data: box, error: boxError } = await supabase
    .from("boxes")
    .select("*")
    .eq("id", product.box_id)
    .single();

  if (boxError) throw boxError;

  const { count, error: countError } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true })
    .eq("box_id", product.box_id);

  if (countError) throw countError;

  const cost = calcUnitCost(
    Number(product.purchase_price),
    Number(box.shipping_cost),
    Number(box.additional_expenses),
    count ?? 0,
  );

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
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
    })
    .select("*")
    .single();

  if (saleError) throw saleError;

  const { data: updatedProduct, error: updateError } = await supabase
    .from("products")
    .update({ status: "sold" })
    .eq("id", productId)
    .select("*")
    .single();

  if (updateError) throw updateError;
  return mapProduct(updatedProduct, mapSale(sale));
}

export async function cancelSale(productId: string): Promise<ProductWithSale> {
  const supabase = await getSupabase();
  if (!supabase) return local.cancelSale(productId);

  const { error: deleteError } = await supabase
    .from("sales")
    .delete()
    .eq("product_id", productId);

  if (deleteError) throw deleteError;

  const { data: product, error } = await supabase
    .from("products")
    .update({ status: "in_stock" })
    .eq("id", productId)
    .select("*")
    .single();

  if (error) throw error;
  return mapProduct(product, null);
}

export type { Box } from "@/lib/types";
