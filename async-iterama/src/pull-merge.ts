import { PullProducer, AsyncIteratorResult } from './types'
import { errorAsyncIteratorResult, asyncIteratorResult, doneAsyncIteratorResult } from './helpers'

const race = <T>(promises: (Promise<IteratorResult<T>> | null)[]) => new Promise<[IteratorResult<T>, number]>((resolve, reject) => {
  promises.forEach((p, i) => p && p.then(
    (res) => resolve([res, i]),
    (reason) => reject([reason, i])
  ))
})

const isValid = (obj: any) => !!obj

const pullMerge = <T> (...producers: PullProducer<T>[]): PullProducer<T> => {
  return async () => {
    const activeProducers: (PullProducer<T> | null)[] = producers.slice()
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

export default pullMerge
