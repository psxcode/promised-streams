import FixedArray from 'circularr'
import { AsyncPushConsumer, AsyncIteratorResult, AsyncPullProducer } from './types'
import { doneAsyncIteratorResult } from './helpers'

const pushTakeFirst = (numTake: number) => <T> (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> => {
  let i = 0

  return async (result) => {
    if (i++ < numTake) {
      return consumer(result)
    }
  }
}

const pushTakeLast = (numSkip: number) => <T> (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> => {
  const values = new FixedArray<AsyncIteratorResult<T>>(numSkip)

  return async (result) => {
    let done = false
    try {
      done = (await result).done
    } catch {}

    if (done) {
      for (const value of values) {
        await consumer(value)
      }

      values.clear()

      return consumer(result)
    }

    values.shift(result)
  }
}

export const pushTake = (numSkip: number) => (
  numSkip < 0
    ? pushTakeLast(-numSkip)
    : pushTakeFirst(numSkip)
)

const pullTakeFirst = (numTake: number) => <T> (producer: AsyncPullProducer<T>): AsyncPullProducer<T> => {
  let i = 0

  return async () => {
    if (i++ < numTake) {
      return producer()
    }

    return doneAsyncIteratorResult()
  }
}

const pullTakeLast = (numTake: number) => <T> (producer: AsyncPullProducer<T>): AsyncPullProducer<T> => {
  const last = new FixedArray<AsyncIteratorResult<T>>(numTake)
  let isInit = false
  let i = 1

  return async () => {
    if (!isInit) {
      isInit = true

      while (true) {
        const air = producer()
        let done = false
        try {
          done = (await air).done
        } catch {}

        if (done) {
          return last.shift(air)
        }

        last.shift(air)
      }
    }

    if (i++ < numTake) {
      return last.shift(undefined as any)
    }

    return doneAsyncIteratorResult()
  }
}

export const pullTake = (numTake: number) => (
  numTake < 0
    ? pullTakeLast(-numTake)
    : pullTakeFirst(numTake)
)
