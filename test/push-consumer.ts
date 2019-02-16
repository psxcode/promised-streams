import { waitTimePromise as wait } from '@psxcode/wait'
import { PushConsumer } from '../src/types'
import noop from './noop'
import isPositiveNumber from './is-positive-number'

export type PushConsumerOptions = {
  log?: typeof console.log,
  delay?: number,
  cancelAtStep?: number,
  continueOnError?: boolean,
}

const pushConsumer = ({ log = noop, delay, cancelAtStep, continueOnError }: PushConsumerOptions = {}) =>
  <T> (sink: (result: IteratorResult<T>) => void): PushConsumer<T> => {
    let i = 0

    return async (result) => {
      log(`receiving data at ${i}`)
      let ir: IteratorResult<T>
      try {
        ir = await result
      } catch (e) {
        log(`received error at step ${i}`)
        log(e)

        if (continueOnError) {
          log(`continue on error at step ${i}`)
          ++i

          return
        }

        log(`returning break on error at step ${i}`)
        ++i

        return Promise.reject('break on error')
      }

      if (ir.done) {
        log(`received done at step ${i}`)
        ++i
        sink(ir)

        return
      }

      log(`received value ${ir.value} at ${i}`)

      if (isPositiveNumber(delay)) {
        await wait(delay)
      }

      sink(ir)

      if (i === cancelAtStep) {
        log(`cancelling at step ${i}`)
        ++i

        return Promise.reject('cancel')
      }
    }
  }

export default pushConsumer
