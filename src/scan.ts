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

      let ir: IteratorResult<T>
      try {
        ir = await result
      } catch {
        return consumer(result as any)
      }

      if (ir.done) {
        state = undefined as any

        return consumer(doneAsyncIteratorResult())
      } else {
        try {
          state = await (reducer(state, ir.value))
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
