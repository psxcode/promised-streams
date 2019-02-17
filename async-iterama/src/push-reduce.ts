import { PushConsumer } from './types'
import { doneAsyncIteratorResult, errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

const pushReduce = <S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) =>
  (consumer: PushConsumer<S>): PushConsumer<T> => {
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

export default pushReduce
