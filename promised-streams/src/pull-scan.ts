import type { PullProducer } from './types.ts'
import { doneAsyncIteratorResult, asyncIteratorResult } from './helpers.ts'

export const pullScan =
  <S, T>(reducer: (state?: S, value?: T) => Promise<S> | S) =>
  (producer: PullProducer<T>): PullProducer<S> => {
    let isInit = false
    let state: S

    return async () => {
      if (!isInit) {
        isInit = true
        state = await reducer()
      }

      const { done, value } = await producer()

      if (done) {
        state = undefined as any

        return doneAsyncIteratorResult()
      }

      state = await reducer(state, value)

      return asyncIteratorResult(state)
    }
  }
