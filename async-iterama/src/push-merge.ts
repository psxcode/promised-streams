import { AsyncIteratorResult, PushProducer } from './types'
import { doneAsyncIteratorResult } from './helpers'

const pushMerge = <T> (...producers: PushProducer<T>[]): PushProducer<T> => {
  let numDoneProducers = 0
  const values: {result: AsyncIteratorResult<T>, resolve: () => void}[] = []
  let consumerError: Promise<void> | undefined = undefined

  return async (consumer) => {
    const checkValue = async (): Promise<void> => {
      if (numDoneProducers === producers.length) {
        return consumer(doneAsyncIteratorResult())
      }

      const nextValue = values.shift()
      if (!nextValue) {
        return
      }

      const { result, resolve } = nextValue

      try {
        await consumer(result)
      } catch (e) {
        consumerError = Promise.reject(e)
      }

      resolve()

      return checkValue()
    }

    for (let i = 0; i < producers.length; ++i) {
      producers[i]((result) => new Promise(async (resolve) => {
        if (consumerError) {
          resolve(consumerError)
        }

        let ir: IteratorResult<T>
        try {
          ir = await result
        } catch {
          values.push({ result, resolve })

          return checkValue()
        }

        if (ir.done) {
          ++numDoneProducers
          checkValue()

          return resolve()
        }

        values.push({ result, resolve })
        checkValue()
      }))
    }
  }
}

export default pushMerge
