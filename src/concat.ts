import { AsyncPullProducer, AsyncPushProducer } from './types'
import { doneAsyncIteratorResult, doneIteratorResult } from './helpers'

export const pushConcat = <T> (...producers: AsyncPushProducer<T>[]): AsyncPushProducer<T> =>
  async (consumer) => {
    for (const producer of producers) {
      await producer(async (result) => {
        let ir: IteratorResult<T>
        try {
          ir = await result
        } catch {
          return consumer(result)
        }

        if (!ir.done) {
          return consumer(result)
        }
      })
    }

    return consumer(doneAsyncIteratorResult())
  }

export const pullConcat = <T> (...producers: AsyncPullProducer<T>[]): AsyncPullProducer<T> => {
  let i = 0

  return async () => {
    while (i < producers.length) {
      const producer = producers[i]
      const air = producer()
      const ir = await air

      if (ir.done) {
        ++i
        continue
      }

      return air
    }

    return doneIteratorResult()
  }
}
