import { PushConsumer, PullProducer } from './types'
import { doneAsyncIteratorResult, asyncIteratorResult, errorAsyncIteratorResult } from './helpers'

function pushZip<T0> (p0: PullProducer<T0>): (consumer: PushConsumer<[T0]>) => Promise<void>
function pushZip<T0, T1> (p0: PullProducer<T0>, p1: PullProducer<T1>): (consumer: PushConsumer<[T0, T1]>) => Promise<void>
function pushZip<T0, T1, T2> (p0: PullProducer<T0>, p1: PullProducer<T1>, p2: PullProducer<T2>): (consumer: PushConsumer<[T0, T1, T2]>) => Promise<void>
function pushZip<T0, T1, T2, T3> (p0: PullProducer<T0>, p1: PullProducer<T1>, p2: PullProducer<T2>, p3: PullProducer<T3>): (consumer: PushConsumer<[T0, T1, T2, T3]>) => Promise<void>

function pushZip (...producers: PullProducer<any>[]) {
  return async (consumer: PushConsumer<any[]>): Promise<void> => {
    while (true) {
      let res: IteratorResult<any>[]
      try {
        res = await Promise.all(producers.map((p) => p()))
      } catch (e) {
        await consumer(errorAsyncIteratorResult(e))
        continue
      }

      if (res.some((r) => r.done)) {
        return consumer(doneAsyncIteratorResult())
      }

      await consumer(asyncIteratorResult(res.map((r) => r.value)))
    }
  }
}

export default pushZip
