import { WaitFn, PushConsumer, UnsubscribeFn } from './types'
import noop from './noop'

const pushThrottle = (wait: WaitFn) => <T> (consumer: PushConsumer<T>): PushConsumer<T> => {
  let last0: Promise<IteratorResult<T>> | undefined
  let last1: Promise<IteratorResult<T>> | undefined
  let consumerResult: Promise<void> | undefined
  let unsub: UnsubscribeFn = undefined

  return async (result) => {
    result.catch(noop)
    last0 = last1
    last1 = result

    consumerResult && await consumerResult
    consumerResult = undefined

    if (unsub) {
      return
    }

    unsub = wait(async (): Promise<void> => {
      unsub = undefined

      /* unwrap result */
      let ir: IteratorResult<T> | undefined = undefined
      try {
        ir = await last1
      } catch {}

      /* check done */
      if (ir && ir.done && last0) {
        try {
          /* send last value before done */
          await (consumerResult = consumer(last0))
        } catch {
          return
        }
      }

      try {
        await (consumerResult = consumer(last1!))
      } catch {}

      if (ir && ir.done) {
        last0 = undefined
        last1 = undefined
      }
    })
  }
}

export default pushThrottle
