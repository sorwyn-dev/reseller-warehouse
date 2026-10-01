export interface ParsedCaption {
  name: string;
  purchasePrice: number;
  size: string | null;
  category: string | null;
}

/**
 * Поддерживаемые форматы:
 * Nike Air Max
 * 12.5
 *
 * Nike Air Max | 12.5
 * Nike Air Max - 12,50
 * Nike Air Max | M | 12.5
 */
export function parseProductCaption(caption: string): ParsedCaption | null {
  const raw = caption.replace(/\r/g, "").trim();
  if (!raw) return null;

  const lines = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length >= 2) {
    return parseParts([...lines]);
  }

  for (const separator of ["|", "/", "—", "–"]) {
    if (!raw.includes(separator)) continue;
    const parts = raw
      .split(separator)
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length >= 2) {
      const parsed = parseParts(parts);
      if (parsed) return parsed;
    }
  }

  const dashMatch = raw.match(/^(.*?)\s+-\s+(\d+(?:[.,]\d{1,2})?)\s*€?\s*$/u);
  if (dashMatch) {
    return parseParts([dashMatch[1], dashMatch[2]]);
  }

  const match = raw.match(/^(.*?)[\s]+(\d+(?:[.,]\d{1,2})?)\s*€?\s*$/u);
  if (match) {
    return parseParts([match[1], match[2]]);
  }

  return null;
}

function parseParts(parts: string[]): ParsedCaption | null {
  if (parts.length < 2) return null;

  const price = parsePrice(parts[parts.length - 1]);
  if (price == null) return null;

  const rest = parts.slice(0, -1).map((part) => part.trim()).filter(Boolean);
  if (rest.length === 0) return null;

  if (rest.length === 1) {
    return {
      name: rest[0],
      purchasePrice: price,
      size: null,
      category: null,
    };
  }

  if (rest.length === 2) {
    const maybeSize = rest[1];
    if (isLikelySize(maybeSize)) {
      return {
        name: rest[0],
        purchasePrice: price,
        size: maybeSize,
        category: null,
      };
    }
    return {
      name: rest[0],
      purchasePrice: price,
      size: null,
      category: maybeSize,
    };
  }

  const size = rest[rest.length - 1];
  const category = rest[rest.length - 2];
  const name = rest.slice(0, -2).join(" ").trim();
  if (!name) return null;

  return {
    name,
    purchasePrice: price,
    size: isLikelySize(size) ? size : size,
    category,
  };
}

function isLikelySize(value: string): boolean {
  return /^[\w./-]{1,12}$/u.test(value) && !/\s/.test(value);
}

function parsePrice(value: string): number | null {
  const cleaned = value
    .replace(/\s/g, "")
    .replace(/€/gi, "")
    .replace(",", ".")
    .trim();
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const price = Number(cleaned);
  return Number.isFinite(price) && price >= 0 ? price : null;
}
