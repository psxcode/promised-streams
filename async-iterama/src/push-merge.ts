import { AsyncIteratorResult, PushProducer } from './types'
import { doneAsyncIteratorResult } from './helpers'

const pushMerge = <T> (...producers: PushProducer<T>[]): PushProducer<T> => {
  let numDoneProducers = 0
  const values: {result: AsyncIteratorResult<T>, resolve: (arg?: any) => void}[] = []
  let consumerError: Promise<void> | undefined = undefined

  return async (consumer) => {
    if (producers.length === 0) {
      return consumer(doneAsyncIteratorResult())
    }

    let consumingInProgress = false
    const consumeNextValue = async (): Promise<void> => {
      if (consumingInProgress) {
        return
      }
      consumingInProgress = true

      if (!consumerError && numDoneProducers === producers.length && values.length === 0) {
        return consumer(doneAsyncIteratorResult())
      }

      const nextValue = values.shift()

      /* no values */
      if (!nextValue) {
        consumingInProgress = false

        return
      }

      const { result, resolve } = nextValue

      /* is consumer canceled */
      if (consumerError) {
        resolve(consumerError)
        consumingInProgress = false

        return consumeNextValue()
      }

      /* unwrap result to check if done */
      let ir: IteratorResult<any> | undefined = undefined
      try {
        ir = await result
      } catch {}

      if (ir && ir.done) {
        resolve()
        ++numDoneProducers
        consumingInProgress = false

        return consumeNextValue()
      }

      let consumerResult
      try {
        await (consumerResult = consumer(result))
      } catch {
        consumerError = consumerResult
      }

      resolve(consumerResult)
      consumingInProgress = false

      return consumeNextValue()
    }

    return Promise.all(
      producers.map((p) => p(
        (result) => new Promise(async (resolve) => {
          values.push({ result, resolve })

          return consumeNextValue()
        })
      ))
    ) as Promise<any>
  }
}

export default pushMerge
