import { PushProducer } from './types'
import { doneAsyncIteratorResult } from './helpers'

const pushConcat = <T> (...producers: PushProducer<T>[]): PushProducer<T> =>
  async (consumer) => {
    let consumerError: Promise<void> | undefined
    for (const producer of producers) {
      await producer(async (result) => {
        if (consumerError) {
          return consumerError
        }
        let ir: IteratorResult<T>
        try {
          ir = await result
        } catch {
          let consumerResult
          try {
            await (consumerResult = consumer(result))
          } catch {
            consumerError = consumerResult
          }

          return consumerResult
        }

        if (!ir.done) {
          let consumerResult
          try {
            return await (consumerResult = consumer(result))
          } catch {
            consumerError = consumerResult
          }

          return consumerResult
        }
      })
    }

    if (!consumerError) {
      return consumer(doneAsyncIteratorResult())
    }
  }

export default pushConcat
