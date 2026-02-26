export const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

export function truncate(str: string, len = 40): string {
  return str.length > len ? str.slice(0, len) + '...' : str;
}

export function solToLamports(sol: number): number {
  return Math.round(sol * 1_000_000_000);
}

export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}
