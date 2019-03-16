import { PullProducer, PushProducer } from './types'
import { errorAsyncIteratorResult } from './helpers'
import noop from './noop'

const pump = <T> (producer: PullProducer<T>): PushProducer<T> =>
  async (consumer) => {
    let done = false

    while (!done) {
      let air: Promise<IteratorResult<T>> | undefined = undefined
      try {
        done = (await (air = producer())).done
      } catch (e) {
        if (!air) {
          (air = errorAsyncIteratorResult(e)).catch(noop)
        }
      }

      try {
        await consumer(air)
      } catch {
        done = true
      }
    }
  }

export default pump
