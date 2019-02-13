import { PullConsumer } from '../src/types'
import noop from './noop'

export type PullConsumerOptions = {
  log?: typeof console.log
}

const pullConsumer = ({ log = noop }: PullConsumerOptions = {}) =>
  (sink: (chunk: any) => void): PullConsumer<any> =>
    (producer) => {
      let result: IteratorResult<any>

      while (!(result = producer()).done) {
        log('received value')

        sink(result.value)
      }
    }

export default pullConsumer
