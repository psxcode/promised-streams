import { PushProducer } from './types'
import { errorAsyncIteratorResult, asyncIteratorResult, doneAsyncIteratorResult } from './helpers'
import noop from './noop'

type ProducerValue = {
  result: Promise<IteratorResult<any>>,
  resolve: (arg: any) => void
}

function pushZip (): PushProducer<[]>
function pushZip<T0> (p0: PushProducer<T0>): PushProducer<[T0]>
function pushZip<T0, T1> (p0: PushProducer<T0>, p1: PushProducer<T1>): PushProducer<[T0, T1]>
function pushZip<T0, T1, T2> (p0: PushProducer<T0>, p1: PushProducer<T1>, p2: PushProducer<T2>): PushProducer<[T0, T1, T2]>
function pushZip<T0, T1, T2, T3> (p0: PushProducer<T0>, p1: PushProducer<T1>, p2: PushProducer<T2>, p3: PushProducer<T3>): PushProducer<[T0, T1, T2, T3]>

function pushZip (...producers: PushProducer<any>[]): PushProducer<any> {
  const values: ProducerValue[][] = producers.map(() => [])

  return async (consumer): Promise<void> => {
    if (producers.length === 0) {
      return consumer(doneAsyncIteratorResult())
    }

    let consumeInProgress = false
    const consumeValue = async (): Promise<void> => {
      if (consumeInProgress) {
        return
      }
      consumeInProgress = true

      if (!values.every((v) => v.length > 0)) {
        consumeInProgress = false

        return
      }

      /* get next values */
      const nextValues = values.map((v) => v.shift()!)
      const airs = nextValues.map(({ result }) => result)

      /* producer error case */
      let irs: IteratorResult<any>[]
      try {
        irs = await Promise.all(airs)
      } catch (e) {
        let consumerResult: Promise<void> | undefined = undefined
        try {
          await (consumerResult = consumer(errorAsyncIteratorResult(e)))
        } catch (e) {
          (consumerResult = Promise.reject(e)).catch(noop)
        }

        nextValues.forEach(({ resolve }) => resolve(consumerResult))

        consumeInProgress = false
        setImmediate(consumeValue)

        return
      }

      /* find done producer index */
      const doneIndices = irs.reduce((indices, { done }, i) => (done && indices.push(i), indices), [] as number[])

      /* solve done state */
      if (doneIndices.length > 0) {
        let consumerResult: Promise<void> | undefined = undefined
        try {
          consumerResult = consumer(doneAsyncIteratorResult())
        } catch (e) {
          (consumerResult = Promise.reject(e)).catch(noop)
        }

        /* prepare cancel promise to stop other producers */
        let consumerCancel: Promise<void>
        (consumerCancel = Promise.reject()).catch(noop)

        /* resolve done producer */
        nextValues.forEach(({ resolve }, i) => resolve(
          doneIndices.includes(i)
            ? consumerResult
            : consumerCancel
        ))

        consumeInProgress = false
        setImmediate(consumeValue)

        return
      }

      /* pass values to consumer */
      const resultValues = irs.map((ir) => ir.value)
      let consumerResult: Promise<void> | undefined = undefined
      try {
        await (consumerResult = consumer(asyncIteratorResult(resultValues)))
      } catch (e) {
        (consumerResult = Promise.reject(e)).catch(noop)
      }

      /* pass consumer result to provider */
      nextValues.forEach(({ resolve }) => resolve(consumerResult))

      consumeInProgress = false
      setImmediate(consumeValue)
    }

    await Promise.all(producers.map((p, i) => p(
      (result) => new Promise((resolve) => {
        values[i].push({ result, resolve })
        consumeValue()
      })
    )))
  }
}

export default pushZip
