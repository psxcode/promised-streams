import { PushConsumer, PushProducer, AsyncIteratorResult } from './types'
import { errorAsyncIteratorResult, asyncIteratorResult, doneAsyncIteratorResult } from './helpers'

function pushZip (): (consumer: PushConsumer<[]>) => Promise<void>
function pushZip<T0> (p0: PushProducer<T0>): (consumer: PushConsumer<[T0]>) => Promise<void>
function pushZip<T0, T1> (p0: PushProducer<T0>, p1: PushProducer<T1>): (consumer: PushConsumer<[T0, T1]>) => Promise<void>
function pushZip<T0, T1, T2> (p0: PushProducer<T0>, p1: PushProducer<T1>, p2: PushProducer<T2>): (consumer: PushConsumer<[T0, T1, T2]>) => Promise<void>
function pushZip<T0, T1, T2, T3> (p0: PushProducer<T0>, p1: PushProducer<T1>, p2: PushProducer<T2>, p3: PushProducer<T3>): (consumer: PushConsumer<[T0, T1, T2, T3]>) => Promise<void>

function pushZip (...producers: PushProducer<any>[]): PushProducer<any> {
  const producerValues: {result: AsyncIteratorResult<any>, resolve: (arg: any) => void}[][] = producers.map(() => [])
  let consumerError: Promise<void> | undefined

  return (consumer) => {
    if (producers.length === 0) {
      return consumer(doneAsyncIteratorResult())
    }

    let consumeInProgress = false
    const consumeValue = async (): Promise<void> => {
      if (consumeInProgress) {
        return
      }
      consumeInProgress = true

      /* get next values */
      let nextValues: any[] | undefined
      if (producerValues.every((v) => v.length > 0)) {
        nextValues = producerValues.map((v) => v.shift())
      }

      /* no values to consume */
      if (!nextValues) {
        consumeInProgress = false

        return
      }

      /* if consumer already canceled */
      if (consumerError) {
        nextValues.forEach(({ resolve }) => resolve(consumerError))
        consumeInProgress = false

        return consumeValue()
      }

      const airs = nextValues.map(({ result }) => result)

      /* producer error case */
      let irs: IteratorResult<any>[]
      try {
        irs = await Promise.all(airs)
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

      /* find done producer index */
      const doneIndices = irs.reduce((indices, { done }, i) => (done && indices.push(i), indices), [] as number[])

      /* solve done state */
      if (doneIndices.length > 0) {
        /* send done to consumer */
        let consumerResult: Promise<void>
        try {
          await (consumerResult = consumer(doneAsyncIteratorResult()))
        } catch {}

        /* prepare cancel promise to stop other producers */
        try {
          await (consumerError = Promise.reject())
        } catch {}

        /* resolve done producer */
        nextValues.forEach(({ resolve }, i) => resolve(
          doneIndices.includes(i)
            ? consumerResult
            : consumerError
        ))

        consumeInProgress = false

        return consumeValue()
      }

      /* pass values to consumer */
      const resultValues = irs.map((ir) => ir.value)
      let consumerResult: Promise<void>
      try {
        await (consumerResult = consumer(asyncIteratorResult(resultValues)))
      } catch {
        consumerError = consumerResult!
      }

      /* pass consumer result to provider */
      nextValues.forEach(({ resolve }) => resolve(consumerResult))
      consumeInProgress = false

      return consumeValue()
    }

    return Promise.all(producers.map((p, i) => p(
      (result) => new Promise((resolve) => {
        producerValues[i].push({ result, resolve })

        return consumeValue()
      })
    ))) as Promise<any>
  }
}

export default pushZip
