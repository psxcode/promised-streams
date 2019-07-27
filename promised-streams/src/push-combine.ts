/* eslint-disable import/export */
import { PushProducer } from './types'
import { errorAsyncIteratorResult, doneAsyncIteratorResult, asyncIteratorResult } from './helpers'

export function pushCombine (): PushProducer<[]>
export function pushCombine <T1>(p1: PushProducer<T1>): PushProducer<[T1]>
export function pushCombine <T1, T2>(p1: PushProducer<T1>, p2: PushProducer<T2>): PushProducer<[T1, T2]>
export function pushCombine <T1, T2, T3>(p1: PushProducer<T1>, p2: PushProducer<T2>, p3: PushProducer<T3>): PushProducer<[T1, T2, T3]>
export function pushCombine <T1, T2, T3, T4>(p1: PushProducer<T1>, p2: PushProducer<T2>, p3: PushProducer<T3>, p4: PushProducer<T4>): PushProducer<[T1, T2, T3, T4]>

export function pushCombine (...producers: PushProducer<any>[]): PushProducer<any> {
  const latest: any[] = producers.map(() => undefined)
  let consumerResult: Promise<void> = Promise.resolve()
  let consumerCanceled = false

  return async (consumer) => {
    await Promise.all(
      producers.map((p, i) => p(
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

            const valuesToSend = asyncIteratorResult(latest.slice())
            try {
              await (consumerResult = consumerResult.then(() => consumer(valuesToSend)))
            } catch {
              consumerCanceled = true
            }

            return consumerResult
          }
        }
      ))
    )

    if (!consumerCanceled) {
      return consumer(doneAsyncIteratorResult())
    }
  }
}
