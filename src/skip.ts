import FixedArray from 'circularr'
import { AsyncPushConsumer, AsyncIteratorResult, AsyncPullProducer } from './types'

const pushSkipFirst = (numSkip: number) => <T> (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> => {
  let i = 0

  return async (result) => {
    let done = false
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

const pushSkipLast = (numSkip: number) => <T> (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> => {
  const values = new FixedArray<AsyncIteratorResult<T>>(numSkip)
  let i = 0

  return async (result) => {
    let done = false
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

export const pushSkip = (numSkip: number) => (
  numSkip < 0
    ? pushSkipLast(-numSkip)
    : pushSkipFirst(numSkip)
)

const pullSkipFirst = (numSkip: number) => <T> (producer: AsyncPullProducer<T>): AsyncPullProducer<T> => {
  let isInit = false

  return async () => {
    if (!isInit) {
      isInit = true
      for (let i = 0; i < numSkip; ++i) {
        const air = producer()
        let done = false
        try {
          done = (await air).done
        } catch {}

        if (done) {
          return air
        }
      }
    }

    return producer()
  }
}

const pullSkipLast = (numSkip: number) => <T> (producer: AsyncPullProducer<T>): AsyncPullProducer<T> => {
  const last = new FixedArray<AsyncIteratorResult<T>>(numSkip)
  let isInit = false

  return async () => {
    if (!isInit) {
      isInit = true
      for (let i = 0; i < numSkip; ++i) {
        const air = producer()
        let done = false
        try {
          done = (await air).done
        } catch {}

        if (done) {
          last.clear()

          return air
        }

        last.shift(air)
      }
    }

    return last.shift(producer())
  }
}

export const pullSkip = (numSkip: number) => (
  numSkip < 0
    ? pullSkipLast(-numSkip)
    : pullSkipFirst(numSkip)
)
