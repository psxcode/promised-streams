/* eslint-disable import/export */
import { PushProducer } from './types'
import { errorAsyncIteratorResult, asyncIteratorResult } from './helpers'
import { noop } from './noop'

export function pushWithLatest (): <T>(main: PushProducer<T>) => PushProducer<[T]>
export function pushWithLatest <T1>(p1: PushProducer<T1>): <T>(main: PushProducer<T>) => PushProducer<[T, T1]>
export function pushWithLatest <T1, T2>(p1: PushProducer<T1>, p2: PushProducer<T2>): <T>(main: PushProducer<T>) => PushProducer<[T, T1, T2]>
export function pushWithLatest <T1, T2, T3>(p1: PushProducer<T1>, p2: PushProducer<T2>, p3: PushProducer<T3>): <T>(main: PushProducer<T>) => PushProducer<[T, T1, T2, T3]>

export function pushWithLatest (...producers: PushProducer<any>[]) {
  return (mainProducer: PushProducer<any>): PushProducer<any[]> => {
    const latest: any[] = producers.map(() => undefined)
    let consumerResult: Promise<void> = Promise.resolve()
    let consumerCancel: Promise<void> | undefined = undefined

    return async (consumer) => {
      await Promise.all([
        ...producers.map((p, i) => p(
          async (result) => {
            if (consumerCancel) {
              return consumerCancel
            }

            let ir: IteratorResult<any>
            try {
              ir = await result
            } catch (e) {
              try {
                await (consumerResult = consumerResult.then(() => consumer(errorAsyncIteratorResult(e))))
              } catch {
                consumerCancel = consumerResult
              }

              return consumerResult
            }

            if (!ir.done) {
              latest[i] = ir.value
            }
          }
        )),
        mainProducer(async (result) => {
          if (consumerCancel) {
            return consumerCancel
          }

          let ir: IteratorResult<any>
          try {
            ir = await result
          } catch (e) {
            try {
              await (consumerResult = consumerResult.then(() => consumer(errorAsyncIteratorResult(e))))
            } catch {
              consumerCancel = consumerResult
            }

            return consumerResult
          }

          if (ir.done) {
            try {
              await (consumerResult = consumerResult.then(() => consumer(result)))
            } catch {}

            (consumerCancel = Promise.reject()).catch(noop)

            return consumerResult
          }

          try {
            await (consumerResult = consumerResult.then(() => consumer(asyncIteratorResult([ir.value, ...latest]))))
          } catch {
            consumerCancel = consumerResult
          }

          return consumerResult
        }),
      ])
    }
  }
}
