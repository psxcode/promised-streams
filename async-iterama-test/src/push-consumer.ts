import { waitTimePromise as wait } from '@psxcode/wait'
import { PushConsumer } from './types'
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
        log(`resolved to error at step ${i}`)
        log(e)

        if (continueOnError) {
          log(`continue on error at step ${i}`)
          ++i

          return
        }

        log(`returning break on error at step ${i}`)
        ++i

        return Promise.reject()
      }

      if (ir.done) {
        log(`resolved to done at step ${i}`)
        ++i
        sink(ir)

        return
      }

      log(`resolved value ${ir.value} at ${i}`)

      if (isPositiveNumber(delay)) {
        log(`consuming value`)
        await wait(delay)
      }

      sink(ir)

      if (i === cancelAtStep) {
        log(`cancelling at step ${i}`)
        ++i

        return Promise.reject()
      }

      ++i
    }
  }

export default pushConsumer
