/* eslint-disable import/export */
import { AsyncPushConsumer, AsyncPullProducer } from './types'
import { doneAsyncIteratorResult, asyncIteratorResult, errorAsyncIteratorResult } from './helpers'

export function pushZip<T0> (p0: AsyncPullProducer<T0>): (consumer: AsyncPushConsumer<[T0]>) => Promise<void>
export function pushZip<T0, T1> (p0: AsyncPullProducer<T0>, p1: AsyncPullProducer<T1>): (consumer: AsyncPushConsumer<[T0, T1]>) => Promise<void>
export function pushZip<T0, T1, T2> (p0: AsyncPullProducer<T0>, p1: AsyncPullProducer<T1>, p2: AsyncPullProducer<T2>): (consumer: AsyncPushConsumer<[T0, T1, T2]>) => Promise<void>
export function pushZip<T0, T1, T2, T3> (p0: AsyncPullProducer<T0>, p1: AsyncPullProducer<T1>, p2: AsyncPullProducer<T2>, p3: AsyncPullProducer<T3>): (consumer: AsyncPushConsumer<[T0, T1, T2, T3]>) => Promise<void>

export function pushZip (...producers: AsyncPullProducer<any>[]) {
  return async (consumer: AsyncPushConsumer<any[]>): Promise<void> => {
    try {
      while (true) {
        let res: IteratorResult<any>[]
        try {
          res = await Promise.all(producers.map((p) => p()))
        } catch (e) {
          await consumer(errorAsyncIteratorResult(e))
          continue
        }

        if (res.some((r) => r.done)) {
          await consumer(doneAsyncIteratorResult())

          return
        }

        await consumer(asyncIteratorResult(res.map((r) => r.value)))
      }
    } catch (e) {
      return
    }
  }
}

export function pullZip<T0> (p0: AsyncPullProducer<T0>): AsyncPullProducer<[T0]>
export function pullZip<T0, T1> (p0: AsyncPullProducer<T0>, p1: AsyncPullProducer<T1>): AsyncPullProducer<[T0, T1]>
export function pullZip<T0, T1, T2> (p0: AsyncPullProducer<T0>, p1: AsyncPullProducer<T1>, p2: AsyncPullProducer<T2>): AsyncPullProducer<[T0, T1, T2]>
export function pullZip<T0, T1, T2, T3> (p0: AsyncPullProducer<T0>, p1: AsyncPullProducer<T1>, p2: AsyncPullProducer<T2>, p3: AsyncPullProducer<T3>): AsyncPullProducer<[T0, T1, T2, T3]>

export function pullZip (...producers: AsyncPullProducer<any>[]): AsyncPullProducer<any[]> {
  return async () => {
    const res = await Promise.all(producers.map((p) => p()))
    if (res.some((r) => r.done)) {
      return doneAsyncIteratorResult()
    }

    return asyncIteratorResult(res.map((r) => r.value))
  }
}
