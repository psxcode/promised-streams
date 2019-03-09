import FixedArray from 'circularr'
import { AsyncIteratorResult, PullProducer } from './types'
import { doneAsyncIteratorResult, errorAsyncIteratorResult } from './helpers'

const pullTakeFirst = (numTake: number) => <T> (producer: PullProducer<T>): PullProducer<T> => {
  let i = 0

  return async () => {
    if (i++ < numTake) {
      return producer()
    }

    return doneAsyncIteratorResult()
  }
}

const pullTakeLast = (numTake: number) => <T> (producer: PullProducer<T>): PullProducer<T> => {
  let last = new FixedArray<AsyncIteratorResult<T>>(numTake)
  let producerError: AsyncIteratorResult<T> | undefined = undefined
  let isInit = false
  let i = 0

  return async () => {
    if (producerError) {
      return producerError
    }

    if (!isInit) {
      isInit = true

      while (true) {
        let air: AsyncIteratorResult<T> | undefined = undefined
        let done = false
        try {
          done = (await (air = producer())).done
        } catch (e) {
          producerError = errorAsyncIteratorResult(e)

          return producerError
        }

        if (done) {
          last = last.trim()
          break
        }

        last.shift(air)
      }
    }

    if (i++ < last.length) {
      return last.shift(undefined as any)
    }

    return doneAsyncIteratorResult()
  }
}

const pullTake = (numTake: number) => (
  numTake < 0
    ? pullTakeLast(-numTake)
    : pullTakeFirst(numTake)
)

export default pullTake
