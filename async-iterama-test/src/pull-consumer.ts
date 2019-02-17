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
        let air: AsyncIteratorResult<any>
        try {
          air = producer()
        } catch (e) {
          log(`producer crashed at step ${i++}`)
          log(e)

          return
        }

        let ir: IteratorResult<any>
        try {
          ir = await air
        } catch (e) {
          log(`producer returned an error at step ${i++}`)
          log(e)

          if (continueOnError) {
            log('continuing on error')
            continue
          }

          throw 'cancel'
        }

        if (isPositiveNumber) {
          await wait(delay)
        }

        log(ir.done
          ? `received done at step ${i++}`
          : `received value at step ${i++}`)
        sink(ir)

        if (ir.done) {
          break
        }
      }
    }
  }

export default pullConsumer
