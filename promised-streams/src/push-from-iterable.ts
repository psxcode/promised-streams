import { iterate } from 'iterama'
import { PushProducer } from './types'

export const pushFromIterable = <T> (iterable: Iterable<T>): PushProducer<T> => async (consumer) => {
  const it = iterate(iterable)

  while (true) {
    const ir = it.next()
    await consumer(Promise.resolve(ir))

    if (ir.done) {
      return
    }
  }
}
