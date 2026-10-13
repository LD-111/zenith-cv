export function isFsSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}
