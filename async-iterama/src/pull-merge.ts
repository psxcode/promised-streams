import { PullProducer, AsyncIteratorResult } from './types'
import { errorAsyncIteratorResult, doneAsyncIteratorResult, race } from './helpers'

const isValid = (obj: any) => !!obj

const pullMerge = <T> (...producers: PullProducer<T>[]): PullProducer<T> => {
  const activeProducers: (PullProducer<T> | null)[] = producers.slice()
  const promises: (AsyncIteratorResult<T> | null)[] = producers.map(() => null)

  return async () => {
    while (activeProducers.some(isValid)) {
      let result: IteratorResult<T>
      let winnerIndex: number
      try {
        for (let i = 0 ; i < activeProducers.length; ++i) {
          const producer = activeProducers[i]
          if (promises[i] === null && producer !== null) {
            promises[i] = producer()
          }
        }
        [result, winnerIndex] = await race(promises)
        promises[winnerIndex] = null
      } catch ([e, index]) {
        activeProducers[index] = null
        promises[index] = null

        return errorAsyncIteratorResult(e)
      }

      if (result.done) {
        activeProducers[winnerIndex] = null
        continue
      }

      return result
    }

    return doneAsyncIteratorResult()
  }
}

export default pullMerge
