import { AsyncPushConsumer, AsyncPullProducer } from './types'
import { errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

export const pushMap = <T, R> (xf: (arg: T) => Promise<R> | R) =>
  (consumer: AsyncPushConsumer<R>): AsyncPushConsumer<T> =>
    async (result) => {
      let ir: IteratorResult<T>
      try {
        ir = await result
      } catch {
        return consumer(result as any)
      }

      if (ir.done) {
        return consumer(result as any)
      }

      let transformed: R
      try {
        transformed = await xf(ir.value)
      } catch (e) {
        return consumer(errorAsyncIteratorResult(e))
      }

      return consumer(asyncIteratorResult(transformed))
    }

export const pullMap = <T, R> (xf: (arg: T) => Promise<R> | R) =>
  (producer: AsyncPullProducer<T>): AsyncPullProducer<R> =>
    async () => {
      const ir = await producer()

      if (ir.done) {
        return ir as any
      }

      return asyncIteratorResult(await xf(ir.value))
    }
