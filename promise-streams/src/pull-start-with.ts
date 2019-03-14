import { PullProducer } from './types'
import { asyncIteratorResult } from './helpers'

const pullStartWith = <T> (...values: T[]) => (producer: PullProducer<T>): PullProducer<T> => {
  let i = 0

  return async () => {
    if (i < values.length) {
      return asyncIteratorResult(values[i++])
    }

    return producer()
  }
}

export default pullStartWith
