import FixedArray from 'circularr'
import { AsyncPushConsumer, AsyncIteratorResult } from './types'

const pushSkipFirst = (numSkip: number) => <T> (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> => {
  let i = 0

  return async (result) => {
    try {
      const ir = await result
      if (ir.done) {
        return consumer(result)
      }
    } catch {
      return consumer(result)
    }

    if (i++ >= numSkip) {
      return consumer(result)
    }
  }
}

const pushSkipLast = (numSkip: number) => <T> (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> => {
  const values = new FixedArray<AsyncIteratorResult<T>>(numSkip)
  const errors = new Set<AsyncIteratorResult<T>>()
  let i = 0

  return async (result) => {
    try {
      const ir = await result
      if (ir.done) {
        (values as any).fill(undefined)
        errors.clear()

        return consumer(result)
      }
    } catch {
      errors.add(result)
    }
    if (i++ < numSkip) {
      values.shift(result)

      return
    }

    return consumer(values.shift(result))
  }
}

export const pushSkip = (numSkip: number) => (
  numSkip < 0
    ? pushSkipLast(-numSkip)
    : pushSkipFirst(numSkip)
)

const pullSkipFirst = (numSkip: number) => <T> (producer: AsyncPullProducer<T>): AsyncPullProducer<T> => {
  return async () => {
    for (let i = 0; i < numSkip; ++i) {
      try {
        await producer()
      } catch {}
    }
  }
}

const pullSkipLast = (numSkip: number) => <T> (producer: AsyncPullProducer<T>): AsyncPullProducer<T> => {
  return async () => {

  }
}

export const pullSkip = (numSkip: number) => (
  numSkip < 0
    ? pullSkipLast(-numSkip)
    : pullSkipFirst(numSkip)
)
