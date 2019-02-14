import { AsyncPullProducer, AsyncIteratorResult, AsyncPushProducer } from './types'
import { doneAsyncIteratorResult, errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

const race = <T>(promises: (Promise<IteratorResult<T>> | null)[]) => new Promise<[IteratorResult<T>, number]>((resolve, reject) => {
  promises.forEach((p, i) => p && p.then(
    (res) => resolve([res, i]),
    (reason) => reject([reason, i])
  ))
})

export const pushMerge = <T> (...producers: AsyncPushProducer<T>[]): AsyncPushProducer<T> => {
  const values: {air: AsyncIteratorResult<T>, consumed: () => void}[] = []
  const inProgress = false

  return async (consumer) => {
    const hasValue = async () => {
      if (inProgress) {
        return
      }

      const { air, consumed } = values

      await consumer
    }

    for (let i = 0; i < producers.length; ++i) {
      producers[i]((result) => new Promise((resolve) => {
        values.push({
          air: result,
          consumed: resolve,
        })
      }))
    }
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
