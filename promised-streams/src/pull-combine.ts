/* eslint-disable import/export */
import { PullProducer } from './types'
import { racePromises, asyncIteratorResult, errorAsyncIteratorResult, doneAsyncIteratorResult } from './helpers'
import { noop } from './noop'

const isValid = (obj: any) => !!obj

export function pullCombine (): PullProducer<[]>
export function pullCombine <T1>(p1: PullProducer<T1>): PullProducer<[T1]>
export function pullCombine <T1, T2>(p1: PullProducer<T1>, p2: PullProducer<T2>): PullProducer<[T1, T2]>
export function pullCombine <T1, T2, T3>(p1: PullProducer<T1>, p2: PullProducer<T2>, p3: PullProducer<T3>): PullProducer<[T1, T2, T3]>
export function pullCombine <T1, T2, T3, T4>(p1: PullProducer<T1>, p2: PullProducer<T2>, p3: PullProducer<T3>, p4: PullProducer<T4>): PullProducer<[T1, T2, T3, T4]>

export function pullCombine (...producers: PullProducer<any>[]): PullProducer<any[]> {
  const activeProducers: (PullProducer<any> | null)[] = producers.slice()
  const values: any[] = producers.map(() => undefined)
  const promises: (Promise<IteratorResult<any>> | null)[] = producers.map(() => null)
  const race = racePromises()

  return async () => {
    while (activeProducers.some(isValid)) {
      let ir: IteratorResult<any>
      let index: number

      for (let i = 0; i < activeProducers.length; ++i) {
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
        [ir, index] = await race(promises)
      } catch ([e, index]) {
        const err = promises[index]!

        activeProducers[index] = null
        promises[index] = null

        return err
      }

      promises[index] = null

      if (ir.done) {
        activeProducers[index] = null

        continue
      }

      values[index] = ir.value

      return asyncIteratorResult(values.slice())
    }

    return doneAsyncIteratorResult()
  }
}
