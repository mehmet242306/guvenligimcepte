/** Nova sohbetinde gosterilecek duz metin — markdown sembollerini temizler. */
export function formatNovaDisplayText(text: string): string {
  if (!text) return "";

  let output = text.replace(/\r\n/g, "\n");

  output = output
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  output = output.replace(/\n{3,}/g, "\n\n").trim();
  return output;
}
