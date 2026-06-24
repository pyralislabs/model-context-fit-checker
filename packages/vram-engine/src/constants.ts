export const ONE_GIB = 2 ** 30;

export const MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER;

export function isPositiveSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function isNonNegativeSafeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

export function safeCeil(value: number): number {
  const result = Math.ceil(value);
  if (!Number.isSafeInteger(result)) {
    throw new RangeError(`Ceil result not a safe integer: ${value}`);
  }
  return result;
}

export function assertSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${label} must be a safe integer, got ${value}`);
  }
}
