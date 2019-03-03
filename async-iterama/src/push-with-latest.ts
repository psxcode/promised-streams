import { PushProducer } from './types'
import { errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

function pushWithLatest (): <T>(main: PushProducer<T>) => PushProducer<[T]>
function pushWithLatest <T1>(p1: PushProducer<T1>): <T>(main: PushProducer<T>) => PushProducer<[T, T1]>
function pushWithLatest <T1, T2>(p1: PushProducer<T1>, p2: PushProducer<T2>): <T>(main: PushProducer<T>) => PushProducer<[T, T1, T2]>
function pushWithLatest <T1, T2, T3>(p1: PushProducer<T1>, p2: PushProducer<T2>, p3: PushProducer<T3>): <T>(main: PushProducer<T>) => PushProducer<[T, T1, T2, T3]>

function pushWithLatest (...producers: PushProducer<any>[]) {
  return (mainProducer: PushProducer<any>): PushProducer<any[]> => {
    const latest: any[] = producers.map(() => undefined)
    let consumerResult: Promise<void> = Promise.resolve()
    let consumerCanceled = false

    return async (consumer) => {
      await Promise.all([
        ...producers.map((p, i) => p(
          async (result) => {
            if (consumerCanceled) {
              return consumerResult
            }

            let ir: IteratorResult<any>
            try {
              ir = await result
            } catch (e) {
              try {
                await (consumerResult = consumerResult.then(() => consumer(errorAsyncIteratorResult(e))))
              } catch {
                consumerCanceled = true
              }

              return consumerResult
            }

            if (!ir.done) {
              latest[i] = ir.value
            }
          }
        )),
        mainProducer(async (result) => {
          if (consumerCanceled) {
            return consumerResult
          }

          let ir: IteratorResult<any>
          try {
            ir = await result
          } catch (e) {
            try {
              await (consumerResult = consumerResult.then(() => consumer(errorAsyncIteratorResult(e))))
            } catch {
              consumerCanceled = true
            }

            return consumerResult
          }

          if (ir.done) {
            return consumer(result)
          }

          try {
            await (consumerResult = consumerResult.then(() => consumer(asyncIteratorResult([ir.value, ...latest]))))
          } catch {
            consumerCanceled = true
          }

          return consumerResult
        }),
      ])
    }
  }
}

export default pushWithLatest
