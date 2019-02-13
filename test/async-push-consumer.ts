import { waitTimePromise as wait } from '@psxcode/wait'
import { AsyncPushConsumer, AsyncIteratorResult } from '../src/types'
import noop from './noop'
import isPositiveNumber from './is-positive-number'

export type AsyncPushConsumerOptions = {
  log?: typeof console.log,
  delay?: number
}

const asyncPushConsumer = ({ log = noop, delay = 0 }: AsyncPushConsumerOptions = {}) =>
  (sink: (chunk: any) => void): AsyncPushConsumer<any> =>
    async (result: AsyncIteratorResult<any>): Promise<void> => {
      log('received value')

      const { value, done } = await result

      if (done) {
        return
      }

      if (isPositiveNumber) {
        await wait(delay)
      }

      sink(value)
    }

export default asyncPushConsumer
