import { PullProducer, AsyncIteratorResult } from './types'
import { doneAsyncIteratorResult, racePromises, errorAsyncIteratorResult } from './helpers'
import noop from './noop'

const isValid = (obj: any) => !!obj

const pullMerge = <T> (...producers: PullProducer<T>[]): PullProducer<T> => {
  const activeProducers: (PullProducer<T> | null)[] = producers.slice()
  const promises: (AsyncIteratorResult<T> | null)[] = producers.map(() => null)
  const race = racePromises()

  return async () => {
    while (activeProducers.some(isValid)) {
      let result: IteratorResult<T>
      let winnerIndex: number

      for (let i = 0 ; i < activeProducers.length; ++i) {
        const producer = activeProducers[i]
        if (promises[i] === null && producer !== null) {
          try {
            promises[i] = producer()
          } catch (e) {
            let err: AsyncIteratorResult<any>
            /* prevent unhandled promise warning */
            (err = errorAsyncIteratorResult(e)).catch(noop)

            activeProducers[i] = null
            promises[i] = null

            return err
          }
        }
      }

      try {
        [result, winnerIndex] = await race(promises)
      } catch ([_, index]) {
        const res = promises[index]!

        activeProducers[index] = null
        promises[index] = null

        return res
      }
      promises[winnerIndex] = null

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
