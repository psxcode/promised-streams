import { FixedArray } from './internal.ts'
import type { PushConsumer } from './types.ts'
import { doneAsyncIteratorResult } from './helpers.ts'
import { noop } from './noop.ts'

const pushTakeFirst =
  (numTake: number) =>
  <T>(consumer: PushConsumer<T>): PushConsumer<T> => {
    let i = 0

    return async (result) => {
      if (i++ < numTake) {
        return consumer(result)
      } else {
        /* prevent unhandled promise warning */
        result.catch(noop)

        await consumer(doneAsyncIteratorResult())

        return Promise.reject()
      }
    }
  }

const pushTakeLast =
  (numTake: number) =>
  <T>(consumer: PushConsumer<T>): PushConsumer<T> => {
    const values = new FixedArray<Promise<IteratorResult<T>>>(numTake)
    let terminated = false

    return async (result) => {
      /* once an error terminated the stream the remaining chunks pass through */
      if (terminated) {
        return consumer(result)
      }

      let done: boolean | undefined = false
      let failed = false
      try {
        done = (await result).done
      } catch {
        failed = true
      }

      if (done) {
        for (const value of values.trim()) {
          await consumer(value)
        }

        values.clear()

        return consumer(result)
      }

      if (failed) {
        terminated = true
        /* the error is the last chunk, the buffered values precede it */
        values.shift(result)

        const buffered = Array.from(values.trim())

        values.clear()

        for (const value of buffered) {
          await consumer(value)
        }

        return
      }

      values.shift(result)
    }
  }

export const pushTake = (numTake: number) =>
  numTake < 0 ? pushTakeLast(-numTake) : pushTakeFirst(numTake)
