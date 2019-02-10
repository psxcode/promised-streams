import { AsyncPushConsumer, AsyncPullProducer } from './types'
import { doneAsyncIteratorResult, errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

export const pushReduce = <S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) =>
  (consumer: AsyncPushConsumer<S>): AsyncPushConsumer<T> => {
    let isInit = false
    let state: S

    return async (result) => {
      if (!isInit) {
        isInit = true
        try {
          state = await reducer()
        } catch (e) {
          return consumer(errorAsyncIteratorResult(e))
        }
      }

      const { done, value } = await result

      if (done) {
        await consumer(asyncIteratorResult(state))
        await consumer(doneAsyncIteratorResult())
      } else {
        try {
          state = await (reducer(state, value))
        } catch (e) {
          return consumer(errorAsyncIteratorResult(e))
        }
      }
    }
  }

export const pullReduce = <S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) =>
  (producer: AsyncPullProducer<T>): AsyncPullProducer<S> => {
    let isDone = false
    let isInit = false
    let state: S

    return async () => {
      try {
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

            return asyncIteratorResult(state)
          }

          state = await reducer(state, value)
        }
      } catch (e) {
        return errorAsyncIteratorResult(e)
      }
    }
  }
