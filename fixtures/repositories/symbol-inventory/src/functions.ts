export async function fetchBatch(ids: string[]): Promise<number> {
  return ids.length;
}

export function* idGenerator(): Generator<number, void, unknown> {
  let id = 1;
  while (id < 100) {
    yield id++;
  }
}

export const multiplyBy =
  (factor: number) =>
  (val: number): number =>
    val * factor;
