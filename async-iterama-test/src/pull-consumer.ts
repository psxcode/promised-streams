import { waitTimePromise as wait } from '@psxcode/wait'
import { PullConsumer, AsyncIteratorResult } from './types'
import noop from './noop'
import isPositiveNumber from './is-positive-number'

export type AsyncPullConsumerOptions = {
  log?: typeof console.log,
  delay?: number,
  continueOnError?: boolean,
}

const pullConsumer = ({ log = noop, delay, continueOnError }: AsyncPullConsumerOptions = {}) =>
  (sink: (chunk: any) => void): PullConsumer<any> => {
    let i = 0

    return async (producer) => {
      while (true) {
        log(`pulling value ${i}`)
        let air: AsyncIteratorResult<any>
        try {
          air = producer()
        } catch (e) {
          log(`producer crashed at step ${i++}`)
          // log(e)

          throw e
        }

        log(`resolving value ${i}`)

        let ir: IteratorResult<any>
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
