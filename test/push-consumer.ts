import { PushConsumer, Signal, SOK } from '../src/types'
import noop from './noop'

export type PushConsumerOptions = {
  log?: typeof console.log
}

const pushConsumer = ({ log = noop }: PushConsumerOptions = {}) => (sink: (chunk: any) => void): PushConsumer<any> =>
  ({ value, done }: IteratorResult<any>): Signal => {
    log('received value')

    if (!done) {
      sink(value)
    }

    return SOK
  }

export default pushConsumer
