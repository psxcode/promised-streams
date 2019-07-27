import { PushConsumer } from './types'

export const pushUnique = <T> (consumer: PushConsumer<T>): PushConsumer<T> => {
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
