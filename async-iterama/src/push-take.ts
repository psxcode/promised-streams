import FixedArray from 'circularr'
import { PushConsumer, AsyncIteratorResult } from './types'
import { doneAsyncIteratorResult } from './helpers'

const pushTakeFirst = (numTake: number) => <T> (consumer: PushConsumer<T>): PushConsumer<T> => {
  let i = 0

  return async (result) => {
    if (i++ < numTake) {
      return consumer(result)
    } else {
      await consumer(doneAsyncIteratorResult())

      return Promise.reject()
    }
  }
}

const pushTakeLast = (numTake: number) => <T> (consumer: PushConsumer<T>): PushConsumer<T> => {
  const values = new FixedArray<AsyncIteratorResult<T>>(numTake)

  return async (result) => {
    let done = false
    try {
      done = (await result).done
    } catch {}

    if (done) {
      for (const value of values.trim()) {
        await consumer(value)
      }

      values.clear()

      return consumer(result)
    }

    values.shift(result)
  }
}

const pushTake = (numTake: number) => (
  numTake < 0
    ? pushTakeLast(-numTake)
    : pushTakeFirst(numTake)
)

export default pushTake
