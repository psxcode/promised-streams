import type { PushProducer } from './types.ts'
import { doneAsyncIteratorResult } from './helpers.ts'
import { noop } from './noop.ts'

export function pushMerge(): PushProducer<any>
export function pushMerge<T0>(p0: PushProducer<T0>): PushProducer<T0>
export function pushMerge<T0, T1>(p0: PushProducer<T0>, p1: PushProducer<T1>): PushProducer<T0 | T1>
export function pushMerge<T0, T1, T2>(
  p0: PushProducer<T0>,
  p1: PushProducer<T1>,
  p2: PushProducer<T2>,
): PushProducer<T0 | T1 | T2>
export function pushMerge<T0, T1, T2, T3>(
  p0: PushProducer<T0>,
  p1: PushProducer<T1>,
  p2: PushProducer<T2>,
  p3: PushProducer<T3>,
): PushProducer<T0 | T1 | T2 | T3>

export function pushMerge(...producers: PushProducer<any>[]): PushProducer<any> {
  const values: { result: Promise<IteratorResult<any>>; resolve: (arg?: any) => void }[] = []
  let consumerCancel: Promise<void> | undefined = undefined

  return async (consumer) => {
    if (producers.length === 0) {
      return consumer(doneAsyncIteratorResult())
    }

    let consumingInProgress = false
    let canceled = false
    let finishedProducers = 0
    let consumerDone: Promise<void> = Promise.resolve()

    /*
     * The terminal done is emitted once every producer is gone, however it
     * ended: with a done chunk, with an error chunk or just by returning.
     */
    const finishProducer = (): void => {
      if (++finishedProducers < producers.length || canceled) {
        return
      }

      canceled = true

      try {
        consumerDone = Promise.resolve(consumer(doneAsyncIteratorResult())).catch(noop)
      } catch {
        /* consumer unsubscribed */
      }
    }

    const consumeNextValue = async (): Promise<void> => {
      if (consumingInProgress) {
        return
      }
      consumingInProgress = true

      const nextValue = values.shift()

      /* no values */
      if (!nextValue) {
        consumingInProgress = false

        return
      }

      const { result, resolve } = nextValue

      /* has consumer canceled */
      if (canceled) {
        resolve(consumerCancel)
        consumingInProgress = false
        setImmediate(consumeNextValue)

        return
      }

      /* unwrap result to check if done */
      let done: boolean | undefined = false
      try {
        done = (await result).done
      } catch {}

      if (done) {
        resolve(undefined)
        consumingInProgress = false
        setImmediate(consumeNextValue)

        return
      }

      let consumerResult: Promise<void> | undefined = undefined
      try {
        await (consumerResult = consumer(result))
      } catch (e) {
        canceled = true
        ;(consumerCancel = consumerResult = Promise.reject(e)).catch(noop)
      }

      resolve(consumerResult)

      consumingInProgress = false
      setImmediate(consumeNextValue)
    }

    const producerResults = producers.map((p) =>
      p(
        (result) =>
          new Promise((resolve) => {
            values.push({ result, resolve })
            consumeNextValue()
          }),
      ),
    )

    await Promise.all(
      producerResults.map((producerResult) => producerResult.then(finishProducer, finishProducer)),
    )
    await consumerDone
  }
}
