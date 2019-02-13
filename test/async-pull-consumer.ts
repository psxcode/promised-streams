import { waitTimePromise as wait } from '@psxcode/wait'
import { AsyncPullConsumer } from '../src/types'
import noop from './noop'
import isPositiveNumber from './is-positive-number'

export type AsyncPullConsumerOptions = {
  log?: typeof console.log,
  delay?: number
}

const asyncPullConsumer = ({ log = noop, delay }: AsyncPullConsumerOptions = {}) =>
  (sink: (chunk: any) => void): AsyncPullConsumer<any> => async (producer) => {
    let result: IteratorResult<any>

    while (!(result = (await producer())).done) {
      log('received value')

      if (isPositiveNumber) {
        await wait(delay)
      }

      sink(result.value)
    }
  }

export default asyncPullConsumer
