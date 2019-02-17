import { WaitFn, PushConsumer, AsyncIteratorResult, UnsubFn } from './types'

const pushDebounce = (wait: WaitFn) => <T> (consumer: PushConsumer<T>): PushConsumer<T> => {
  let last0: AsyncIteratorResult<T>
  let last1: AsyncIteratorResult<T>
  let unsub: UnsubFn
  let consumerPromise: Promise<void> | undefined

  return async (result) => {
    last0 = last1
    last1 = result

    try {
      consumerPromise && await consumerPromise
    } catch {
      return consumerPromise
    }
    consumerPromise = undefined

    unsub && unsub()
    unsub = wait(async () => {
      unsub = undefined

      let ir: IteratorResult<T>
      try {
        ir = await last1
      } catch {
        // consumerPromise = consumer(last1)

        return
      }

      if (ir.done) {
        try {
          consumerPromise = consumer(last0)
          await consumerPromise
        } catch {
          return
        }
      }

      try {
        consumerPromise = consumer(last1)
      } catch {}
    })
  }
}

export default pushDebounce
