export function replace(contents: string, kv: Record<string, string>): string {
  const keys = Object.keys(kv);
  if (keys.length === 0) return contents;

  const pattern = new RegExp(
    keys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
    "g",
  );

  return contents.replace(pattern, (matched) => kv[matched] ?? matched);
}
