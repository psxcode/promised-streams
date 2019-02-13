import { PushConsumer } from '../src/types'
import noop from './noop'

export type PushConsumerOptions = {
  log?: typeof console.log
}

const pushConsumer = ({ log = noop }: PushConsumerOptions = {}) =>
  (sink: (chunk: any) => void): PushConsumer<any> =>
    ({ value, done }: IteratorResult<any>): void => {
      log('received value')

      if (!done) {
        sink(value)
      }
    }

export default pushConsumer
