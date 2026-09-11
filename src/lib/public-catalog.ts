export function isHiddenFromPublicCatalog(name: string) {
  const value = name.toLowerCase();
  return value.includes("кран") && !value.includes("манипулятор");
}
