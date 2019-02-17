import { PullProducer } from './types'
import { doneIteratorResult } from './helpers'

const pullConcat = <T> (...producers: PullProducer<T>[]): PullProducer<T> => {
  let i = 0

  return async () => {
    while (i < producers.length) {
      const producer = producers[i]
      const air = producer()
      const ir = await air

      if (ir.done) {
        ++i
        continue
      }

      return air
    }

    return doneIteratorResult()
  }
}

export default pullConcat
