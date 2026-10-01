"use server";

import { revalidatePath } from "next/cache";
import * as repo from "@/lib/data/repository";
import type {
  CreateBoxInput,
  CreateProductInput,
  CreateSaleInput,
  UpdateBoxInput,
  UpdateProductInput,
} from "@/lib/types";

function revalidateBox(boxId?: string) {
  revalidatePath("/");
  if (boxId) {
    revalidatePath(`/boxes/${boxId}`);
    revalidatePath(`/boxes/${boxId}/edit`);
  }
  revalidatePath("/boxes/new");
}

export async function createBoxAction(input: CreateBoxInput) {
  const box = await repo.createBox(input);
  revalidateBox(box.id);
  return box;
}

export async function updateBoxAction(id: string, input: UpdateBoxInput) {
  const box = await repo.updateBox(id, input);
  revalidateBox(id);
  return box;
}

export async function deleteBoxAction(id: string) {
  await repo.deleteBox(id);
  revalidateBox(id);
}

export async function addProductAction(boxId: string, input: CreateProductInput) {
  const product = await repo.addProduct(boxId, input);
  revalidateBox(boxId);
  return product;
}

export async function addProductsAction(
  boxId: string,
  inputs: CreateProductInput[],
) {
  const products = await repo.addProducts(boxId, inputs);
  revalidateBox(boxId);
  return products;
}

export async function updateProductAction(
  id: string,
  boxId: string,
  input: UpdateProductInput,
) {
  const product = await repo.updateProduct(id, input);
  revalidateBox(boxId);
  return product;
}

export async function deleteProductAction(id: string, boxId: string) {
  await repo.deleteProduct(id);
  revalidateBox(boxId);
}

export async function sellProductAction(
  productId: string,
  boxId: string,
  input: CreateSaleInput,
) {
  const product = await repo.sellProduct(productId, input);
  revalidateBox(boxId);
  return product;
}

export async function cancelSaleAction(productId: string, boxId: string) {
  const product = await repo.cancelSale(productId);
  revalidateBox(boxId);
  return product;
}
