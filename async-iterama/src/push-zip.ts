import { PushConsumer, PushProducer, AsyncIteratorResult } from './types'
import { errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

function pushZip<T0> (p0: PushProducer<T0>): (consumer: PushConsumer<[T0]>) => Promise<void>
function pushZip<T0, T1> (p0: PushProducer<T0>, p1: PushProducer<T1>): (consumer: PushConsumer<[T0, T1]>) => Promise<void>
function pushZip<T0, T1, T2> (p0: PushProducer<T0>, p1: PushProducer<T1>, p2: PushProducer<T2>): (consumer: PushConsumer<[T0, T1, T2]>) => Promise<void>
function pushZip<T0, T1, T2, T3> (p0: PushProducer<T0>, p1: PushProducer<T1>, p2: PushProducer<T2>, p3: PushProducer<T3>): (consumer: PushConsumer<[T0, T1, T2, T3]>) => Promise<void>

function pushZip (...producers: PushProducer<any>[]): PushProducer<any> {
  const producerValues: {result: AsyncIteratorResult<any>, resolve: (arg: any) => void}[][] = producers.map(() => [])
  let consumerError: Promise<void> | undefined
  let donePromise: Promise<void> | undefined

  return async (consumer) => {
    let consumeInProgress = false
    const consumeValue = async (): Promise<void> => {
      if (consumeInProgress) {
        return
      }
      consumeInProgress = true

      let nextValues: any[] | undefined
      if (producerValues.every((v) => v.length > 0)) {
        nextValues = producerValues.map((v) => v.shift())
      }

      if (!nextValues) {
        consumeInProgress = false

        return
      }

      if (consumerError) {
        nextValues.forEach(({ resolve }) => resolve(consumerError))
        consumeInProgress = false

        return consumeValue()
      }

      const values = nextValues.map(({ result }) => result)

      let results: IteratorResult<any>[]
      try {
        results = await Promise.all(values)
      } catch (e) {
        let consumerResult: Promise<void>
        try {
          await (consumerResult = consumer(errorAsyncIteratorResult(e)))
        } catch {
          consumerError = consumerResult!
        }

        nextValues.forEach(({ resolve }) => resolve(consumerResult))
        consumeInProgress = false

        return consumeValue()
      }

      let resultValues: any[] = []
      for (let i = 0; i < ) {
        if (done) {
          consumerError
          return
        }

        resultValues.push(value)
      }

      let consumerResult: Promise<void>
      try {
        await (consumerResult = consumer(asyncIteratorResult(resultValues)))
      } catch {
        consumerError = consumerResult!
      }

      nextValues.forEach(({ resolve }) => resolve(consumerResult))
      consumeInProgress = false

      return consumeValue()

    }

    return Promise.all(producers.map((p, i) => p(
      (result) => new Promise((resolve) => {
        producerValues[i].push({ result, resolve })
      })
    ))) as Promise<any>
  }
}

export default pushZip
