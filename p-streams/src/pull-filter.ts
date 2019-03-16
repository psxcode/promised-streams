import { PullProducer } from './types'

const pullFilter = <T> (predicate: (arg: T) => Promise<boolean> | boolean) =>
  (producer: PullProducer<T>): PullProducer<T> =>
    async () => {
      while (true) {
        const ir = await producer()

        if (ir.done || await predicate(ir.value)) {
          return ir
        }
      }
    }

export default pullFilter
