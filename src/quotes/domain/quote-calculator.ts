// Cálculo de importes de una cotización. Función pura y sin coma flotante: todo
// se hace en céntimos enteros (BigInt) con redondeo half-up, para que el total
// que ve el cliente coincida exactamente con el que guarda numeric(14,2).

export interface CalculatorLineInput {
  quantity: number;
  unitPrice: number;
  discountPercent: number;
}

export interface CalculatedLine {
  // quantity * unitPrice, antes del descuento de la línea.
  gross: number;
  discount: number;
  // gross - discount (antes de IVA): es lo que se guarda en line_total.
  lineTotal: number;
}

export interface CalculatedTotals {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
}

export interface CalculatedQuote extends CalculatedTotals {
  lines: CalculatedLine[];
}

const toHundredths = (value: number): bigint => BigInt(Math.round(value * 100));
const fromCents = (cents: bigint): number => Number(cents) / 100;

// Cociente entero redondeado half-up (operandos no negativos).
const divRound = (numerator: bigint, denominator: bigint): bigint =>
  (numerator * 2n + denominator) / (denominator * 2n);

export function calculateQuote(
  lines: readonly CalculatorLineInput[],
  taxPercent: number,
): CalculatedQuote {
  let subtotal = 0n;
  let discount = 0n;

  const calculated = lines.map((line) => {
    // Cantidad y porcentaje tienen 2 decimales: se trabajan como centésimas.
    const gross = divRound(
      toHundredths(line.quantity) * toHundredths(line.unitPrice),
      100n,
    );
    const lineDiscount = divRound(
      gross * toHundredths(line.discountPercent),
      10000n,
    );
    subtotal += gross;
    discount += lineDiscount;

    return {
      gross: fromCents(gross),
      discount: fromCents(lineDiscount),
      lineTotal: fromCents(gross - lineDiscount),
    };
  });

  const base = subtotal - discount;
  const tax = divRound(base * toHundredths(taxPercent), 10000n);

  return {
    lines: calculated,
    subtotal: fromCents(subtotal),
    discount: fromCents(discount),
    tax: fromCents(tax),
    total: fromCents(base + tax),
  };
}
