import { PullProducer } from './types'

const pullFilter = <T> (pred: (arg: T) => Promise<boolean> | boolean) =>
  (producer: PullProducer<T>): PullProducer<T> =>
    async () => {
      while (true) {
        const ir = await producer()

        if (ir.done || await pred(ir.value)) {
          return ir
        }
      }
    }

export default pullFilter
