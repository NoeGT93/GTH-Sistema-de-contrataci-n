/** Normaliza a E.164. Números de 8 dígitos se asumen de Guatemala (+502). null = inválido. */
export function normalizePhone(raw: string): string | null {
  const plus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 8) return `+502${digits}`;
  if (digits.length === 11 && digits.startsWith("502")) return `+${digits}`;
  if (plus && digits.length >= 8 && digits.length <= 15) return `+${digits}`;
  return null;
}
