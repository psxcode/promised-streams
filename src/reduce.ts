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

      let ir: IteratorResult<T>
      try {
        ir = await result
      } catch {
        return consumer(result as any)
      }

      if (ir.done) {
        await consumer(asyncIteratorResult(state))
        state = undefined as any
        await consumer(doneAsyncIteratorResult())
      } else {
        try {
          state = await (reducer(state, ir.value))
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
