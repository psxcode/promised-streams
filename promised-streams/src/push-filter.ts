import { PushConsumer } from './types'
import { errorAsyncIteratorResult } from './helpers'

export const pushFilter = <T> (predicate: (arg: T) => Promise<boolean> | boolean) =>
  (consumer: PushConsumer<T>): PushConsumer<T> =>
    async (result) => {
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
        allowed = await predicate(ir.value)
      } catch (e) {
        return consumer(errorAsyncIteratorResult(e))
      }

      if (allowed) {
        return consumer(result)
      }
    }

