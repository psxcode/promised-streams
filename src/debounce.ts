import { WaitFn, AsyncPushConsumer, AsyncIteratorResult, UnsubFn } from './types'

export const pushDebounce = (wait: WaitFn) => <T> (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> => {
  let last: AsyncIteratorResult<T>
  let waitUnsubscribe: UnsubFn
  let lastConsumerPromise: Promise<void> | undefined

  return async (result) => {
    last = result

    lastConsumerPromise && await lastConsumerPromise
    lastConsumerPromise = undefined

    waitUnsubscribe && waitUnsubscribe()
    waitUnsubscribe = wait(() => {
      waitUnsubscribe = undefined
      lastConsumerPromise = consumer(last)
    })
  }
}
