import { PullProducer } from './types'

export const pullDo = <T> (doFunction: (arg: T) => Promise<void> | void) =>
  (producer: PullProducer<T>): PullProducer<T> =>
    async () => {
      const ir = await producer()

      if (ir.done) {
        return ir as any
      }

      try {
        await doFunction(ir.value)
      } catch {}

      return ir
    }
