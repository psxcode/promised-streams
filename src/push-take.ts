import FixedArray from 'circularr'
import { PushConsumer, AsyncIteratorResult } from './types'

const pushTakeFirst = (numTake: number) => <T> (consumer: PushConsumer<T>): PushConsumer<T> => {
  let i = 0

  return async (result) => {
    if (i++ < numTake) {
      return consumer(result)
    }
  }
}

const pushTakeLast = (numSkip: number) => <T> (consumer: PushConsumer<T>): PushConsumer<T> => {
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

const pushTake = (numSkip: number) => (
  numSkip < 0
    ? pushTakeLast(-numSkip)
    : pushTakeFirst(numSkip)
)

export default pushTake
