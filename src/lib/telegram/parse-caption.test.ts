import { describe, expect, it } from "vitest";
import { parseProductCaption } from "@/lib/telegram/parse-caption";

describe("parseProductCaption", () => {
  it("парсит название и цену с новой строки", () => {
    expect(parseProductCaption("Nike Air Max\n12.5")).toEqual({
      name: "Nike Air Max",
      purchasePrice: 12.5,
      size: null,
      category: null,
    });
  });

  it("парсит формат через |", () => {
    expect(parseProductCaption("Adidas Samba | 18")).toEqual({
      name: "Adidas Samba",
      purchasePrice: 18,
      size: null,
      category: null,
    });
  });

  it("парсит размер и цену", () => {
    expect(parseProductCaption("Куртка Zara | M | 9,5")).toEqual({
      name: "Куртка Zara",
      purchasePrice: 9.5,
      size: "M",
      category: null,
    });
  });

  it("возвращает null без цены", () => {
    expect(parseProductCaption("Просто название")).toBeNull();
  });
});
