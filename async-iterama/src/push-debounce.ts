import { WaitFn, PushConsumer, AsyncIteratorResult, UnsubFn } from './types'
import noop from './noop'

const pushDebounce = (wait: WaitFn) => <T> (consumer: PushConsumer<T>): PushConsumer<T> => {
  let last0: AsyncIteratorResult<T> | undefined
  let last1: AsyncIteratorResult<T>
  let unsub: UnsubFn
  let consumerResult: Promise<void> | undefined

  return async (result) => {
    result.catch(noop)
    last0 = last1
    last1 = result

    /* previous value consume is still in progress */
    consumerResult && await consumerResult
    consumerResult = undefined

    unsub && unsub()
    unsub = wait(async () => {
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
        await (consumerResult = consumer(last1))
      } catch {}
    })
  }
}

export default pushDebounce
