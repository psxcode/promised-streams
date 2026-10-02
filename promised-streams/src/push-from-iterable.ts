import { iterate } from './internal.ts'
import type { PushProducer } from './types.ts'

export const pushFromIterable =
  <T>(iterable: Iterable<T>): PushProducer<T> =>
  async (consumer) => {
    const it = iterate(iterable)

    while (true) {
      const ir = it.next()

      try {
        await consumer(Promise.resolve(ir))
      } catch {
        /* consumer unsubscribed: stop pushing, the producer promise must not reject */
        return
      }

      if (ir.done) {
        return
      }
    }
  }
