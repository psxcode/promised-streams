import type { PushConsumer } from './types.ts'
import { asyncIteratorResult } from './helpers.ts'

export const pushStartWith =
  <T>(...values: T[]) =>
  (consumer: PushConsumer<T>): PushConsumer<T> => {
    let isInit = false

    return async (result) => {
      if (!isInit) {
        isInit = true
        for (const value of values) {
          await consumer(asyncIteratorResult(value))
        }
      }

      return consumer(result)
    }
  }
