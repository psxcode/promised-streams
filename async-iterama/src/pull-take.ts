import FixedArray from 'circularr'
import { AsyncIteratorResult, PullProducer } from './types'
import { doneAsyncIteratorResult } from './helpers'

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

const pullTake = (numTake: number) => (
  numTake < 0
    ? pullTakeLast(-numTake)
    : pullTakeFirst(numTake)
)

export default pullTake
