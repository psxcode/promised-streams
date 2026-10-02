import { FixedArray } from './internal.ts'
import type { PushConsumer } from './types.ts'

const pushSkipFirst =
  (numSkip: number) =>
  <T>(consumer: PushConsumer<T>): PushConsumer<T> => {
    let i = 0

    return async (result) => {
      let done: boolean | undefined = false
      try {
        done = (await result).done
      } catch {}

      if (done) {
        return consumer(result)
      }

      if (i++ >= numSkip) {
        return consumer(result)
      }
    }
  }

const pushSkipLast =
  (numSkip: number) =>
  <T>(consumer: PushConsumer<T>): PushConsumer<T> => {
    const values = new FixedArray<Promise<IteratorResult<T>>>(numSkip)
    let i = 0

    return async (result) => {
      let done: boolean | undefined = false
      try {
        done = (await result).done
      } catch {}

      if (done) {
        values.clear()

        return consumer(result)
      }

      const value = values.shift(result)

      if (i++ >= numSkip) {
        return consumer(value)
      }
    }
  }

export const pushSkip = (numSkip: number) =>
  numSkip < 0 ? pushSkipLast(-numSkip) : pushSkipFirst(numSkip)
