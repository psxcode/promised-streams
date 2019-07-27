import { PullProducer } from './types'
import { errorAsyncIteratorResult } from './helpers'

export const pullSide = <T> (sideFn: (value: T) => Promise<void> | void) => (producer: PullProducer<T>): PullProducer<T> =>
  async () => {
    const air = producer()
    const ir = await air

    if (ir.done) {
      return air
    }

    try {
      await sideFn(ir.value)
    } catch (e) {
      return errorAsyncIteratorResult(e)
    }

    return air
  }
