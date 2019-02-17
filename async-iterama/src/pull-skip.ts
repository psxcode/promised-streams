import FixedArray from 'circularr'
import { AsyncIteratorResult, PullProducer } from './types'

const pullSkipFirst = (numSkip: number) => <T> (producer: PullProducer<T>): PullProducer<T> => {
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

const pullSkipLast = (numSkip: number) => <T> (producer: PullProducer<T>): PullProducer<T> => {
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

const pullSkip = (numSkip: number) => (
  numSkip < 0
    ? pullSkipLast(-numSkip)
    : pullSkipFirst(numSkip)
)

export default pullSkip
