import type { PullProducer, PushProducer } from './types.ts'
import { errorAsyncIteratorResult } from './helpers.ts'
import { noop } from './noop.ts'

export const pump =
  <T>(producer: PullProducer<T>): PushProducer<T> =>
  async (consumer) => {
    let done: boolean | undefined = false

    while (!done) {
      let air: Promise<IteratorResult<T>> | undefined = undefined
      try {
        done = (await (air = producer())).done
      } catch (e) {
        if (!air) {
          ;(air = errorAsyncIteratorResult(e)).catch(noop)
        }
      }

      try {
        await consumer(air)
      } catch {
        done = true
      }
    }
  }
