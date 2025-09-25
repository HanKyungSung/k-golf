import { KgolfAPI } from '../types/global';

export function api(): KgolfAPI | undefined {
  return (window as any).kgolf as KgolfAPI | undefined;
}

export function requireApi(): KgolfAPI {
  const inst = api();
  if (!inst) throw new Error('Bridge not ready');
  return inst;
}

export async function safe<T>(fn: (api: KgolfAPI) => Promise<T>): Promise<T | undefined> {
  try { const a = requireApi(); return await fn(a); } catch { return undefined; }
}