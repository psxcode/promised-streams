import { waitTimePromise as wait } from '@psxcode/wait'
import { AsyncPullConsumer } from '../src/types'
import noop from './noop'

export type AsyncPullConsumerOptions = {
  log?: typeof console.log,
  delay?: number
}

const asyncPullConsumer = ({ log = noop, delay = 0 }: AsyncPullConsumerOptions = {}) => (sink: (chunk: any) => void): AsyncPullConsumer<any> => async (producer) => {
  let result: IteratorResult<any>
  while (!(result = (await producer())).done) {
    log('received value')
    sink(result.value)
    await wait(delay)
  }
}

export default asyncPullConsumer
