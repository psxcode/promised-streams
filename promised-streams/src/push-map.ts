import type { PushConsumer } from './types.ts'
import { errorAsyncIteratorResult, asyncIteratorResult } from './helpers.ts'

export const pushMap =
  <T, R>(xf: (arg: T) => Promise<R> | R) =>
  (consumer: PushConsumer<R>): PushConsumer<T> =>
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
