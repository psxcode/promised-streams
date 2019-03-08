import { waitTimePromise as wait } from '@psxcode/wait'
import { PullProducer, AsyncIteratorResult } from './types'
import noop from './noop'
import isPositiveNumber from './is-positive-number'

export type AsyncPullConsumerOptions = {
  log?: typeof console.log,
  delay?: number,
  continueOnError?: boolean,
}

const pullConsumer = ({ log = noop, delay, continueOnError }: AsyncPullConsumerOptions = {}) =>
  (sink: (chunk: IteratorResult<any>) => void) => {
    let i = 0

    return async <T> (producer: PullProducer<T>) => {
      while (true) {
        log(`pulling value ${i}`)
        let air: AsyncIteratorResult<T>
        try {
          air = producer()
        } catch (e) {
          log(`producer crashed at step ${i++}`)

          throw e
        }

        log(`resolving value ${i}`)

        let ir: IteratorResult<T>
        try {
          ir = await air
        } catch (e) {
          log(`producer returned an error at step ${i++}`)
          log(e)

          if (continueOnError) {
            log('continuing on producer error')
            continue
          }

          log('stopping on producer error')

          throw e
        }

        log(ir.done
          ? `resolved to done at step ${i++}`
          : `resolved value at step ${i++}`)

        if (isPositiveNumber(delay)) {
          await wait(delay)
        }

        sink(ir)

        if (ir.done) {
          break
        }
      }
    }
  }

export default pullConsumer
