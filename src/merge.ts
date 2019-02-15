import { AsyncPullProducer, AsyncIteratorResult, AsyncPushProducer } from './types'
import { errorAsyncIteratorResult, asyncIteratorResult, doneAsyncIteratorResult } from './helpers'

const race = <T>(promises: (Promise<IteratorResult<T>> | null)[]) => new Promise<[IteratorResult<T>, number]>((resolve, reject) => {
  promises.forEach((p, i) => p && p.then(
    (res) => resolve([res, i]),
    (reason) => reject([reason, i])
  ))
})

const isValid = (obj: any) => !!obj

export const pushMerge = <T> (...producers: AsyncPushProducer<T>[]): AsyncPushProducer<T> => {
  const values: {result: AsyncIteratorResult<T>, resolve: () => void}[] = []
  const inProgress = false

  return async (consumer) => {
    const hasValue = async () => {
      if (inProgress) {
        return
      }

      const { result, resolve } = values.shift()

      await consumer
    }

    for (let i = 0; i < producers.length; ++i) {
      producers[i]((result) => new Promise((resolve) => {
        values.push({ result, resolve })
      }))
    }
  }
}

export const pullMerge = <T> (...producers: AsyncPullProducer<T>[]): AsyncPullProducer<T> => {
  return async () => {
    const activeProducers: (AsyncPullProducer<T> | null)[] = producers.slice()
    const promises: (AsyncIteratorResult<T> | null)[] = producers.map(() => null)

    while (activeProducers.some(isValid)) {
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

    return doneAsyncIteratorResult()
  }
}
