import { waitTimePromise as wait } from '@psxcode/wait'
import { PushConsumer } from 'promised-streams/src'
import noop from './noop'
import isPositiveNumber from './is-positive-number'

export type PushConsumerOptions = {
  log?: typeof console.log,
  delay?: number,
  cancelAtStep?: number,
  continueOnError?: boolean,
  crashAtStep?: number,
}

const pushConsumer = ({ log = noop, delay, cancelAtStep, continueOnError, crashAtStep }: PushConsumerOptions = {}) =>
  <T> (sink: (result: IteratorResult<T>) => void): PushConsumer<T> => {
    let i = 0

    return (result) => {
      log(`receiving data at ${i}`)

      if (i === crashAtStep) {
        log(`crashing at ${i}`)
        throw new Error(`consumer crashed at step ${0}`)
      }

      return result.then(async (ir) => {
        log(
          ir.done
            ? `resolved 'done' at step ${i}`
            : `resolved 'value' at step ${i}`
        )

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
      }, (e) => {
        log(`resolved to error at step ${i}`)
        log(e)

        if (continueOnError) {
          log(`continue on error at step ${i}`)
          ++i

          return Promise.resolve()
        }

        log(`returning break on error at step ${i}`)
        ++i

        return Promise.reject()
      })
    }
  }

export default pushConsumer
