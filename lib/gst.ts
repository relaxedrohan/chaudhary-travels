import type { TaxType } from "./types";

/**
 * Preview only — the database trigger computes the stored values.
 *
 * Works in whole paise so it matches Postgres numeric rounding (half away from
 * zero) exactly; floating-point Math.round was off by ₹0.01 on some prices.
 */
export function splitGst(total: number, rate: number, taxType: TaxType) {
  const totalPaise = Math.round(total * 100);
  // taxable = round(total / (1 + rate/100), 2), with rate held in hundredths of a percent
  const den = 10000 + Math.round(rate * 100);
  const num = totalPaise * 10000;
  const taxablePaise = Math.floor((2 * num + den) / (2 * den));
  const taxPaise = totalPaise - taxablePaise;
  const rupees = (p: number) => p / 100;

  if (taxType === "IGST") {
    return { taxable: rupees(taxablePaise), cgst: 0, sgst: 0, igst: rupees(taxPaise) };
  }
  // round(tax / 2, 2): an odd paisa rounds up into CGST, as in the database
  const cgstPaise = Math.ceil(taxPaise / 2);
  return {
    taxable: rupees(taxablePaise),
    cgst: rupees(cgstPaise),
    sgst: rupees(taxPaise - cgstPaise),
    igst: 0,
  };
}
