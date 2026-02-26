export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export function truncate(str: string, len = 40): string {
  return str.length > len ? str.slice(0, len) + '...' : str;
}
