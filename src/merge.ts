import { AsyncPushConsumer, AsyncPullProducer, AsyncIteratorResult } from './types'
import { doneAsyncIteratorResult, errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

const race = <T>(promises: (Promise<IteratorResult<T>> | null)[]) => new Promise<[IteratorResult<T>, number]>((resolve, reject) => {
  promises.forEach((p, i) => p && p.then(
    (res) => resolve([res, i]),
    (reason) => reject([reason, i])
  ))
})

export const pushMerge = <T> (...producers: AsyncPullProducer<T>[]) =>
  async (consumer: AsyncPushConsumer<T>): Promise<void> => {
    try {
      const activeProducers: (AsyncPullProducer<T> | null)[] = producers.slice()
      const promises: (AsyncIteratorResult<T> | null)[] = producers.map(() => null)

      while (true) {
        if (activeProducers.every((p) => p === null)) {
          return
        }

        let result: IteratorResult<T>
        let index: number
        try {
          for (let i = 0 ; i < producers.length; ++i) {
            const producer = activeProducers[i]
            if (promises[i] === null && producer !== null) {
              promises[i] = producer()
            }
          }
          [result, index] = await race(promises)
          promises[index] = null
        } catch ([e, index]) {
          await consumer(errorAsyncIteratorResult(e))
          activeProducers[index] = null
          promises[index] = null
          continue
        }

        if (result.done) {
          activeProducers[index] = null
          continue
        }

        await consumer(asyncIteratorResult(result.value))
      }
    } catch (e) {
      return
    }
  }

export const pullMerge = <T> (...producers: AsyncPullProducer<T>[]): AsyncPullProducer<T> => {
  return async () => {
    const activeProducers: (AsyncPullProducer<T> | null)[] = producers.slice()
    const promises: (AsyncIteratorResult<T> | null)[] = producers.map(() => null)

    while (true) {
      if (activeProducers.every((p) => p === null)) {
        return doneAsyncIteratorResult()
      }

      let result: IteratorResult<T>
      let index: number
      try {
        for (let i = 0 ; i < producers.length; ++i) {
          const producer = activeProducers[i]
          if (promises[i] === null && producer !== null) {
            promises[i] = producer()
          }
        }
        [result, index] = await race(promises)
        promises[index] = null
      } catch ([e, index]) {
        activeProducers[index] = null
        promises[index] = null

        return errorAsyncIteratorResult(e)
      }

      if (result.done) {
        activeProducers[index] = null
        continue
      }

      asyncIteratorResult(result.value)
    }
  }
}
