/* eslint-disable import/export */
import { PullProducer } from './types'
import { doneAsyncIteratorResult, doneIteratorResult, iteratorResult } from './helpers'

export function pullZip (): PullProducer<[]>
export function pullZip<T0> (p0: PullProducer<T0>): PullProducer<[T0]>
export function pullZip<T0, T1> (p0: PullProducer<T0>, p1: PullProducer<T1>): PullProducer<[T0, T1]>
export function pullZip<T0, T1, T2> (p0: PullProducer<T0>, p1: PullProducer<T1>, p2: PullProducer<T2>): PullProducer<[T0, T1, T2]>
export function pullZip<T0, T1, T2, T3> (p0: PullProducer<T0>, p1: PullProducer<T1>, p2: PullProducer<T2>, p3: PullProducer<T3>): PullProducer<[T0, T1, T2, T3]>

export function pullZip (...producers: PullProducer<any>[]): PullProducer<any[]> {
  return producers.length > 0
    ? async () => {
      const res = await Promise.all(producers.map((p) => p()))

      if (res.some((r) => r.done)) {
        return doneIteratorResult()
      }

      return iteratorResult(res.map((r) => r.value))
    }
    : () => doneAsyncIteratorResult()
}
