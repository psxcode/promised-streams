import { PullProducer } from './types'
import { doneAsyncIteratorResult, asyncIteratorResult } from './helpers'

function pullZip<T0> (p0: PullProducer<T0>): PullProducer<[T0]>
function pullZip<T0, T1> (p0: PullProducer<T0>, p1: PullProducer<T1>): PullProducer<[T0, T1]>
function pullZip<T0, T1, T2> (p0: PullProducer<T0>, p1: PullProducer<T1>, p2: PullProducer<T2>): PullProducer<[T0, T1, T2]>
function pullZip<T0, T1, T2, T3> (p0: PullProducer<T0>, p1: PullProducer<T1>, p2: PullProducer<T2>, p3: PullProducer<T3>): PullProducer<[T0, T1, T2, T3]>

function pullZip (...producers: PullProducer<any>[]): PullProducer<any[]> {
  return async () => {
    const res = await Promise.all(producers.map((p) => p()))
    if (res.some((r) => r.done)) {
      return doneAsyncIteratorResult()
    }

    return asyncIteratorResult(res.map((r) => r.value))
  }
}

export default pullZip
