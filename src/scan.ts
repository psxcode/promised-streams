import { AsyncPushConsumer, AsyncPullProducer } from './types'
import { doneAsyncIteratorResult, errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

export const pushScan = <S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) =>
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
        return consumer(doneAsyncIteratorResult())
      } else {
        try {
          state = await (reducer(state, value))
        } catch (e) {
          return consumer(errorAsyncIteratorResult(e))
        }

        return consumer(asyncIteratorResult(state))
      }
    }
  }

export const pullScan = <S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) =>
  (producer: AsyncPullProducer<T>): AsyncPullProducer<S> => {
    let isInit = false
    let state: S

    return async () => {
      try {
        if (!isInit) {
          isInit = true
          state = await reducer()
        }

        const { done, value } = await producer()

        if (done) {
          return doneAsyncIteratorResult()
        }

        state = await reducer(state, value)

        return asyncIteratorResult(state)
      } catch (e) {
        return errorAsyncIteratorResult(e)
      }
    }
  }
