export function firstNonEmpty(
  ...vals: Array<string | null | undefined>
): string | undefined {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).toString().trim();
    if (s !== "") return v as string;
  }
  return undefined;
}
