import { AsyncPushConsumer, AsyncPullProducer } from './types'

export const pushUnique = <T> (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> => {
  const last = new Set<T>()

  return async (result) => {
    let ir: IteratorResult<T>
    try {
      ir = await result
    } catch {
      return consumer(result)
    }

    if (ir.done) {
      last.clear()

      return consumer(result)
    }

    if (!last.has(ir.value)) {
      last.add(ir.value)

      return consumer(result)
    }
  }
}

export const pullUnique = <T> (producer: AsyncPullProducer<T>): AsyncPullProducer<T> => {
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
