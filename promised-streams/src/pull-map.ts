import { PullProducer } from './types'
import { asyncIteratorResult } from './helpers'

export const pullMap = <T, R> (xf: (arg: T) => Promise<R> | R) =>
  (producer: PullProducer<T>): PullProducer<R> =>
    async () => {
      const ir = await producer()

      if (ir.done) {
        return ir as any
      }

      return asyncIteratorResult(await xf(ir.value))
    }
