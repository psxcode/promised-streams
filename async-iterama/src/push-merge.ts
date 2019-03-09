import { AsyncIteratorResult, PushProducer } from './types'
import { doneAsyncIteratorResult } from './helpers'

const pushMerge = <T> (...producers: PushProducer<T>[]): PushProducer<T> => {
  let numDoneProducers = 0
  const values: {result: AsyncIteratorResult<T>, resolve: (arg?: any) => void}[] = []
  let consumerCancel: Promise<void> | undefined = undefined

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

      const nextValue = values.shift()

      /* no values */
      if (!nextValue) {
        consumingInProgress = false

        return
      }

      const { result, resolve } = nextValue

      /* has consumer canceled */
      if (consumerCancel) {
        resolve(consumerCancel)

        consumingInProgress = false
        setImmediate(consumeNextValue)

        return
      }

      /* unwrap result to check if done */
      let done = false
      try {
        done = (await result).done
      } catch {}

      if (done) {
        ++numDoneProducers

        resolve(
          numDoneProducers === producers.length
            ? consumer(result)
            : undefined
        )

        consumingInProgress = false
        setImmediate(consumeNextValue)

        return
      }

      let consumerResult: Promise<void> | undefined = undefined
      try {
        await (consumerResult = consumer(result))
      } catch (e) {
        consumerCancel = consumerResult = Promise.reject(e)
      }

      resolve(consumerResult)

      consumingInProgress = false
      setImmediate(consumeNextValue)
    }

    await Promise.all(
      producers.map((p) => p(
        (result) => new Promise(async (resolve) => {
          values.push({ result, resolve })
          consumeNextValue()
        })
      ))
    )
  }
}

export default pushMerge
