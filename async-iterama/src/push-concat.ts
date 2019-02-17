import { PushProducer } from './types'
import { doneAsyncIteratorResult } from './helpers'

const pushConcat = <T> (...producers: PushProducer<T>[]): PushProducer<T> =>
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

export default pushConcat
