import { WaitFn, PushConsumer, AsyncIteratorResult, UnsubFn } from './types'
import noop from './noop'

const pushDebounce = (wait: WaitFn) => <T> (consumer: PushConsumer<T>): PushConsumer<T> => {
  let last0: AsyncIteratorResult<T>
  let last1: AsyncIteratorResult<T>
  let unsub: UnsubFn
  let consumerPromise: Promise<void> | undefined

  return async (result) => {
    result.catch(noop)
    last0 = last1
    last1 = result

    if (consumerPromise) {
      try {
        await consumerPromise
      } catch {
        return consumerPromise
      }
      consumerPromise = undefined
    }

    unsub && unsub()
    unsub = wait(async () => {
      unsub = undefined

      let ir: IteratorResult<T>
      try {
        ir = await last1
      } catch {
        try {
          await (consumerPromise = consumer(last1))
        } catch {}

        return
      }

      if (ir.done) {
        try {
          await (consumerPromise = consumer(last0))
        } catch {
          return
        }
      }

      try {
        await (consumerPromise = consumer(last1))
      } catch {}
    })
  }
}

export default pushDebounce
