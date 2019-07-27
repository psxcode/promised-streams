import FixedArray from 'circularr'
import { PushConsumer } from './types'
import { doneAsyncIteratorResult } from './helpers'
import { noop } from './noop'

const pushTakeFirst = (numTake: number) => <T> (consumer: PushConsumer<T>): PushConsumer<T> => {
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

const pushTakeLast = (numTake: number) => <T> (consumer: PushConsumer<T>): PushConsumer<T> => {
  const values = new FixedArray<Promise<IteratorResult<T>>>(numTake)

  return async (result) => {
    let done = false
    try {
      done = (await result).done
    } catch {}

    if (done) {
      for (const value of values.trim()) {
        await consumer(value)
      }

      return consumer(result)
    }

    values.shift(result)
  }
}

export const pushTake = (numTake: number) => (
  numTake < 0
    ? pushTakeLast(-numTake)
    : pushTakeFirst(numTake)
)
