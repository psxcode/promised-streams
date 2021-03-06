import { waitTimePromise as wait } from '@psxcode/wait'
import { PullProducer } from 'promised-streams/src'
import { noop } from './noop'
import { isPositiveNumber } from './is-positive-number'

const MAX_ERROR_RETRIES = 2

export type AsyncPullConsumerOptions = {
  log?: typeof console.log,
  delay?: number,
  continueOnError?: boolean,
}

export const pullConsumer = ({ log = noop, delay, continueOnError }: AsyncPullConsumerOptions = {}) =>
  (sink: (chunk: IteratorResult<any>) => void) => {
    let i = 0
    let errorRetries = 0

    return async <T> (producer: PullProducer<T>) => {
      while (true) {
        if (isPositiveNumber(delay)) {
          await wait(delay)
        }

        log(`pulling value ${i}`)
        let air: Promise<IteratorResult<T>>
        try {
          air = producer()
        } catch (e) {
          log(`producer crashed at step ${i}`)

          throw e
        }

        log(`resolving value ${i}`)

        let ir: IteratorResult<T>
        try {
          ir = await air
        } catch (e) {
          log(`producer returned an error at step ${i}`)
          log(e)

          if (continueOnError) {
            if (++errorRetries >= MAX_ERROR_RETRIES) {
              log('producer returns errors, stopping')
              throw e
            }

            log('continuing on producer error')
            ++i

            continue
          }

          log('stopping on producer error')

          throw e
        }

        log(ir.done
          ? `resolved to done at step ${i}`
          : `resolved value at step ${i}`)

        sink(ir)

        if (ir.done) {
          break
        }

        ++i
      }
    }
  }
