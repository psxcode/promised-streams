import { AsyncPushConsumer, AsyncPullProducer } from './types'
import { errorAsyncIteratorResult } from './helpers'

export const pushFilter = <T> (pred: (arg: T) => Promise<boolean> | boolean) =>
  (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> => async (result) => {
    let ir: IteratorResult<T>
    try {
      ir = await result
    } catch {
      return consumer(result)
    }

    if (ir.done) {
      return consumer(result)
    }

    let allowed: boolean
    try {
      allowed = await pred(ir.value)
    } catch (e) {
      return consumer(errorAsyncIteratorResult(e))
    }

    if (allowed) {
      return consumer(result)
    }
  }

export const pullFilter = <T> (pred: (arg: T) => Promise<boolean> | boolean) =>
  (producer: AsyncPullProducer<T>): AsyncPullProducer<T> => async () => {
    try {
      while (true) {
        const ir = await producer()

        if (ir.done || await pred(ir.value)) {
          return ir
        }
      }
    } catch (e) {
      return errorAsyncIteratorResult(e)
    }
  }
