import { AsyncPushConsumer, AsyncPullProducer } from './types'
import { asyncIteratorResult } from './helpers'

export const pushStartWith = <T> (...values: T[]) => (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> => {
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

export const pullStartWith = <T> (...values: T[]) => (producer: AsyncPullProducer<T>): AsyncPullProducer<T> => {
  let i = 0

  return async () => {
    if (i < values.length) {
      return asyncIteratorResult(values[i++])
    }

    return producer()
  }
}
