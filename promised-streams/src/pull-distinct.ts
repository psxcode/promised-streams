import type { PullProducer } from './types.ts'

export const pullDistinct =
  <T>(isAllowed: (prev: T | undefined, next: T) => Promise<boolean> | boolean) =>
  (producer: PullProducer<T>): PullProducer<T> => {
    /* there is no previous chunk before the first one */
    let prevValue: T | undefined = undefined

    return async () => {
      while (true) {
        const ir = await producer()

        if (ir.done || (await isAllowed(prevValue, ir.value))) {
          prevValue = ir.value

          return ir
        }
      }
    }
  }
