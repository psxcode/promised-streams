import { waitTimePromise as wait } from '@psxcode/wait'
import { Signal, SOK, AsyncPushConsumer, AsyncIteratorResult } from '../src/types'
import noop from './noop'

export type AsyncPushConsumerOptions = {
  log?: typeof console.log,
  delay?: number
}

const asyncPushConsumer = ({ log = noop, delay = 0 }: AsyncPushConsumerOptions = {}) => (sink: (chunk: any) => void): AsyncPushConsumer<any> =>
  async (result: AsyncIteratorResult<any>): Promise<Signal> => {
    log('received value')

    const { value, done } = await result

    if (!done) {
      sink(value)
    }

    await wait(delay)

    return SOK
  }

export default asyncPushConsumer
