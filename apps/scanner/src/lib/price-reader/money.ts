/** Currencies without a minor unit. Every other supported currency has two decimals. */
const ZERO_DECIMAL = new Set(["JPY"]);

export function minorDigits(currency: string): number {
  return ZERO_DECIMAL.has(currency.toUpperCase()) ? 0 : 2;
}

/**
 * Parses a price as shops write it ("1 299,00", "1,299.00", "649", 54.9) into an integer in
 * the currency's minor unit. Returns null for anything that isn't a positive amount.
 *
 * Separators: when both "," and "." appear, the last one is the decimal point. A lone ","
 * is decimal only when two or fewer digits follow it ("549,00"), otherwise a thousands
 * separator ("1,299"). A lone "." is decimal, as schema.org prices are written.
 */
export function toMinorUnits(value: unknown, currency: string): number | null {
  let amount: number;
  if (typeof value === "number") {
    amount = value;
  } else if (typeof value === "string") {
    let s = value.replace(/[\s  ]/g, "").replace(/[^\d.,-]/g, "");
    const lastComma = s.lastIndexOf(",");
    const lastDot = s.lastIndexOf(".");
    if (lastComma !== -1 && lastDot !== -1) {
      const decimal = lastComma > lastDot ? "," : ".";
      const thousands = decimal === "," ? "." : ",";
      s = s.split(thousands).join("").replace(decimal, ".");
    } else if (lastComma !== -1) {
      const decimals = s.length - lastComma - 1;
      s =
        decimals <= 2 && s.indexOf(",") === lastComma ? s.replace(",", ".") : s.split(",").join("");
    } else if (s.indexOf(".") !== lastDot) {
      // Several dots can only be thousands separators: "1.299.000".
      s = s.split(".").join("");
    }
    amount = Number(s);
  } else {
    return null;
  }
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 10 ** minorDigits(currency));
}

/** Whole-percent discount from a normal and a sale price, or null when there's none. */
export function discountPercent(normalPrice: number, salePrice: number | null): number | null {
  if (salePrice === null || salePrice >= normalPrice) return null;
  return Math.round((1 - salePrice / normalPrice) * 100);
}
