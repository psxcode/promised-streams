/* eslint-disable import/export */
import { PullProducer } from './types'
import { doneAsyncIteratorResult, racePromises, errorAsyncIteratorResult } from './helpers'
import { noop } from './noop'

const isValid = (obj: any) => !!obj

export function pullMerge (): PullProducer<any>
export function pullMerge <T0> (p0: PullProducer<T0>): PullProducer<T0>
export function pullMerge <T0, T1> (p0: PullProducer<T0>, p1: PullProducer<T1>): PullProducer<T0 | T1>
export function pullMerge <T0, T1, T2> (p0: PullProducer<T0>, p1: PullProducer<T1>, p2: PullProducer<T2>): PullProducer<T0 | T1 | T2>
export function pullMerge <T0, T1, T2, T3> (p0: PullProducer<T0>, p1: PullProducer<T1>, p2: PullProducer<T2>, p3: PullProducer<T3>): PullProducer<T0 | T1 | T2 | T3>

export function pullMerge (...producers: PullProducer<any>[]): PullProducer<any> {
  const activeProducers: (PullProducer<any> | null)[] = producers.slice()
  const promises: (Promise<IteratorResult<any>> | null)[] = producers.map(() => null)
  const race = racePromises()

  return async () => {
    while (activeProducers.some(isValid)) {
      let result: IteratorResult<any>
      let winnerIndex: number

      for (let i = 0 ; i < activeProducers.length; ++i) {
        const producer = activeProducers[i]
        if (promises[i] === null && producer !== null) {
          try {
            promises[i] = producer()
          } catch (e) {
            let err: Promise<IteratorResult<any>>
            /* prevent unhandled promise warning */
            (err = errorAsyncIteratorResult(e)).catch(noop)

            activeProducers[i] = null
            promises[i] = null

            return err
          }
        }
      }

      try {
        [result, winnerIndex] = await race(promises)
      } catch ([_, index]) {
        const res = promises[index]!

        activeProducers[index] = null
        promises[index] = null

        return res
      }
      promises[winnerIndex] = null

      if (result.done) {
        activeProducers[winnerIndex] = null
        continue
      }

      return result
    }

    return doneAsyncIteratorResult()
  }
}
