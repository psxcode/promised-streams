import { PullProducer } from './types'
import { doneAsyncIteratorResult, asyncIteratorResult } from './helpers'

const pullReduce = <S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) =>
  (producer: PullProducer<T>): PullProducer<S> => {
    let isDone = false
    let isInit = false
    let state: S

    return async () => {
      if (isDone) {
        return doneAsyncIteratorResult()
      }

      if (!isInit) {
        isInit = true
        state = await reducer()
      }

      while (true) {
        const { done, value } = await producer()

        if (done) {
          isDone = true
          state = undefined as any

          return asyncIteratorResult(state)
        }

        state = await reducer(state, value)
      }
    }
  }

export default pullReduce
