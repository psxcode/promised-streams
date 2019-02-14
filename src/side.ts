import { AsyncPushConsumer, AsyncPullProducer, AsyncIteratorResult } from './types'
import { errorAsyncIteratorResult } from './helpers'

export const pushSide = <T> (sideFn: (value: T) => Promise<void> | void) => (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> =>
  async (result) => {
    let ir: IteratorResult<T>
    try {
      ir = await result
    } catch {
      return consumer(result)
    }

    if (ir.done) {
      return consumer(result)
    }

    try {
      await sideFn(ir.value)
    } catch (e) {
      return consumer(errorAsyncIteratorResult(e))
    }

    return consumer(result)
  }

export const pullSide = <T> (sideFn: (value: T) => Promise<void> | void) => (producer: AsyncPullProducer<T>): AsyncPullProducer<T> =>
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
