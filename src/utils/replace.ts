export function replace(contents: string, kv: Record<string, string>): string {
  for (const [key, value] of Object.entries(kv)) {
    contents = contents.replaceAll(key, value);
  }
  return contents;
}
