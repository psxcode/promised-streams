import { WaitFn, PushConsumer, AsyncIteratorResult } from './types'

const pushThrottle = (wait: WaitFn) => <T> (consumer: PushConsumer<T>): PushConsumer<T> => {
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

export default pushThrottle
