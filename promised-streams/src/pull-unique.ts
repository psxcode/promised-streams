import { PullProducer } from './types'

export const pullUnique = <T> (producer: PullProducer<T>): PullProducer<T> => {
  const last = new Set<T>()

  return async () => {
    while (true) {
      const ir = await producer()

      if (ir.done || !last.has(ir.value)) {
        last.add(ir.value)

        return ir
      }
    }
  }
}
