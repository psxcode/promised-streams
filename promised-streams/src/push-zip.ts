import type { PushProducer } from './types.ts'
import {
  errorAsyncIteratorResult,
  asyncIteratorResult,
  doneAsyncIteratorResult,
} from './helpers.ts'
import { noop } from './noop.ts'

type ProducerValue = {
  result: Promise<IteratorResult<any>>
  resolve: (arg: any) => void
}

export function pushZip(): PushProducer<[]>
export function pushZip<T0>(p0: PushProducer<T0>): PushProducer<[T0]>
export function pushZip<T0, T1>(p0: PushProducer<T0>, p1: PushProducer<T1>): PushProducer<[T0, T1]>
export function pushZip<T0, T1, T2>(
  p0: PushProducer<T0>,
  p1: PushProducer<T1>,
  p2: PushProducer<T2>,
): PushProducer<[T0, T1, T2]>
export function pushZip<T0, T1, T2, T3>(
  p0: PushProducer<T0>,
  p1: PushProducer<T1>,
  p2: PushProducer<T2>,
  p3: PushProducer<T3>,
): PushProducer<[T0, T1, T2, T3]>

export function pushZip(...producers: PushProducer<any>[]): PushProducer<any> {
  const values: ProducerValue[][] = producers.map(() => [])

  return async (consumer): Promise<void> => {
    if (producers.length === 0) {
      return consumer(doneAsyncIteratorResult())
    }

    const finished: boolean[] = producers.map(() => false)
    let consumeInProgress = false
    let terminated = false
    const consumeValue = async (): Promise<void> => {
      if (consumeInProgress || terminated) {
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
        } catch (rejection) {
          terminated = true
          ;(consumerResult = Promise.reject(rejection)).catch(noop)
        }

        nextValues.forEach(({ resolve }) => resolve(consumerResult))

        consumeInProgress = false
        setImmediate(consumeValue)

        return
      }

      /* find done producer index */
      const doneIndices: number[] = []

      for (let i = 0; i < irs.length; ++i) {
        if (irs[i]!.done) {
          doneIndices.push(i)
        }
      }

      /* solve done state */
      if (doneIndices.length > 0) {
        terminated = true

        let consumerResult: Promise<void> | undefined = undefined
        try {
          consumerResult = consumer(doneAsyncIteratorResult())
        } catch (rejection) {
          ;(consumerResult = Promise.reject(rejection)).catch(noop)
        }

        /* do not emit a second done when these producers settle */
        doneIndices.forEach((i) => {
          finished[i] = true
        })

        /* prepare cancel promise to stop other producers */
        let consumerCancel: Promise<void>
        ;(consumerCancel = Promise.reject()).catch(noop)

        /* resolve done producer */
        nextValues.forEach(({ resolve }, i) =>
          resolve(doneIndices.includes(i) ? consumerResult : consumerCancel),
        )

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
        terminated = true
        ;(consumerResult = Promise.reject(e)).catch(noop)
      }

      /* pass consumer result to provider */
      nextValues.forEach(({ resolve }) => resolve(consumerResult))

      consumeInProgress = false
      setImmediate(consumeValue)
    }

    /*
     * A producer is allowed to settle without ever pushing a done chunk (for
     * example after forwarding an error). Feed a synthetic done chunk for such
     * producers, otherwise their peers block forever on a slot nobody fills.
     */
    const endProducer = (index: number): void => {
      if (finished[index] || terminated) {
        return
      }

      finished[index] = true
      values[index].push({ result: doneAsyncIteratorResult(), resolve: noop })
      consumeValue()
    }

    await Promise.all(
      producers.map((p, i) => {
        const onSettled = (): void => endProducer(i)

        return p(
          (result) =>
            new Promise((resolve) => {
              values[i].push({ result, resolve })
              consumeValue()
            }),
        ).then(onSettled, onSettled)
      }),
    )
  }
}
