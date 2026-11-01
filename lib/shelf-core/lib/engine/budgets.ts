export { budgets } from "../config/budgets";
/** Deadline covers caller latency even when a faulty adapter ignores cancellation. */
export async function bounded<T>(
  ms: number,
  run: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      run(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new Error("Stage deadline exceeded"));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
export async function parallelMap<T, R>(
  values: T[],
  concurrency: number,
  fn: (value: T, index: number) => Promise<R>,
): Promise<R[]> {
  let next = 0;
  const results: R[] = [];
  await Promise.all(
    Array.from({ length: Math.min(values.length, concurrency) }, async () => {
      while (next < values.length) {
        const index = next++;
        results[index] = await fn(values[index], index);
      }
    }),
  );
  return results;
}
