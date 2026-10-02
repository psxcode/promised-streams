/**
 * Small dependency-free helpers inlined from the previously external
 * `iterama` and `@psxcode/wait` packages.
 */

export function* iterate<T>(iterable: Iterable<T>): Generator<T> {
  yield* iterable
}

export const waitTimePromise = (ms = 0): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
