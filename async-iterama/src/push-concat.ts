import { PushProducer } from './types'
import { doneAsyncIteratorResult } from './helpers'

const pushConcat = <T> (...producers: PushProducer<T>[]): PushProducer<T> =>
  async (consumer) => {
    let consumerError: Promise<void> | undefined

    for (const producer of producers) {
      await producer(async (result) => {
        /* if consumer canceled */
        if (consumerError) {
          return consumerError
        }

        /* unwrap result */
        let ir: IteratorResult<T> | undefined = undefined
        try {
          ir = await result
        } catch {}

        if (ir && ir.done) {
          return
        }

        let consumerResult
        try {
          return await (consumerResult = consumer(result))
        } catch {
          /* store cancelation for next producers */
          consumerError = consumerResult
        }

        return consumerResult
      })
    }

    if (!consumerError) {
      return consumer(doneAsyncIteratorResult())
    }
  }

export default pushConcat
