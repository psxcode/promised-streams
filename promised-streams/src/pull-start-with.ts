import type { PullProducer } from './types.ts'
import { asyncIteratorResult } from './helpers.ts'

export const pullStartWith =
  <T>(...values: T[]) =>
  (producer: PullProducer<T>): PullProducer<T> => {
    let i = 0

    return async () => {
      if (i < values.length) {
        return asyncIteratorResult(values[i++])
      }

      return producer()
    }
  }
