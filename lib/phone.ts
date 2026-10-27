/**
 * Keeps the 10-digit Indian mobile number from whatever was typed or pasted:
 * "+91 98102 90486", "09810290486", "919810290486" all become "9810290486".
 * (A maxLength on the input would cut a paste before the prefix is removed.)
 */
export function normalizePhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length > 10 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
}
