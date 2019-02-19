import { PushConsumer, PushProducer } from './types'

function pushZip<T0> (p0: PushProducer<T0>): (consumer: PushConsumer<[T0]>) => Promise<void>
function pushZip<T0, T1> (p0: PushProducer<T0>, p1: PushProducer<T1>): (consumer: PushConsumer<[T0, T1]>) => Promise<void>
function pushZip<T0, T1, T2> (p0: PushProducer<T0>, p1: PushProducer<T1>, p2: PushProducer<T2>): (consumer: PushConsumer<[T0, T1, T2]>) => Promise<void>
function pushZip<T0, T1, T2, T3> (p0: PushProducer<T0>, p1: PushProducer<T1>, p2: PushProducer<T2>, p3: PushProducer<T3>): (consumer: PushConsumer<[T0, T1, T2, T3]>) => Promise<void>

function pushZip (...producers: PushProducer<any>[]): PushProducer<any> {
  const values = producers.map(() => [])

  return async (consumer) => {
    return Promise.all(producers.map((p, i) => p(
      async (result) => {

      }
    ))) as Promise<any>
  }
}

export default pushZip
