import { WaitFn, AsyncPushConsumer, AsyncIteratorResult } from './types'

export const pushThrottle = (wait: WaitFn) => <T> (consumer: AsyncPushConsumer<T>): AsyncPushConsumer<T> => {
  let last: AsyncIteratorResult<T>
  let lastConsumerPromise: Promise<void> | undefined

  return async (result) => {
    last = result

    lastConsumerPromise && await lastConsumerPromise
    lastConsumerPromise = undefined

    wait(() => {
      lastConsumerPromise = consumer(last)
    })
  }
}
