import { PullProducer } from './types'
import { doneIteratorResult, iteratorResult } from './helpers'

const pullReduce = <S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) =>
  (producer: PullProducer<T>): PullProducer<S> => {
    let isDone = false
    let isInit = false
    let state: S

    return async () => {
      if (isDone) {
        state = undefined as any

        return doneIteratorResult()
      }

      if (!isInit) {
        isInit = true
        state = await reducer()
      }

      while (true) {
        const { done, value } = await producer()

        if (done) {
          isDone = true

          return iteratorResult(state)
        }

        state = await reducer(state, value)
      }
    }
  }

export default pullReduce
