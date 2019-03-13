import FixedArray from 'circularr'
import { PullProducer } from './types'
import { errorAsyncIteratorResult, doneAsyncIteratorResult } from './helpers'

const pullSkipFirst = (numSkip: number) => <T> (producer: PullProducer<T>): PullProducer<T> => {
  let isInit = false

  return async () => {
    if (!isInit) {
      isInit = true
      for (let i = 0; i < numSkip; ++i) {
        let done = false
        try {
          done = (await producer()).done
        } catch {}

        if (done) {
          return doneAsyncIteratorResult()
        }
      }
    }

    return producer()
  }
}

const pullSkipLast = (numSkip: number) => <T> (producer: PullProducer<T>): PullProducer<T> => {
  const last = new FixedArray<Promise<IteratorResult<T>>>(numSkip)
  let producerError: Promise<IteratorResult<T>> | undefined = undefined
  let isInit = false

  return async () => {
    if (producerError) {
      return producerError
    }

    if (!isInit) {
      isInit = true
      for (let i = 0; i < numSkip; ++i) {
        let air: Promise<IteratorResult<T>> | undefined = undefined
        let done = false
        try {
          done = (await (air = producer())).done
        } catch (e) {
          producerError = errorAsyncIteratorResult(e)

          return producerError
        }

        if (done) {
          last.clear()

          return air
        }

        last.shift(air)
      }
    }

    let air: Promise<IteratorResult<T>> | undefined = undefined
    let done = false
    try {
      done = (await (air = producer())).done
    } catch (e) {
      producerError = errorAsyncIteratorResult(e)

      return producerError
    }

    if (done) {
      return air
    }

    return last.shift(air)
  }
}

const pullSkip = (numSkip: number) => (
  numSkip < 0
    ? pullSkipLast(-numSkip)
    : pullSkipFirst(numSkip)
)

export default pullSkip
