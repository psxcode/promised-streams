import { waitTimePromise as wait } from '@psxcode/wait'
import { iteratorResult, doneAsyncIteratorResult } from './helpers'
import { PushProducer } from './types'
import noop from './noop'
import isPositiveNumber from './is-positive-number'

export type PushProducerOptions = {
  log?: typeof console.log
  dataResolveDelay?: number,
  dataPrepareDelay?: number,
  errorAtStep?: number,
}

const pushProducer = ({ log = noop, dataResolveDelay, dataPrepareDelay, errorAtStep }: PushProducerOptions = {}) =>
  <T>(data: Iterable<T>): PushProducer<T> => {
    let i = 0

    return async (consumer) => {
      for (const chunk of data) {
        try {
          if (isPositiveNumber(dataPrepareDelay)) {
            log(`preparing data ${i}`)
            await wait(dataPrepareDelay)
          }

          await consumer(new Promise(async (resolve, reject) => {
            if (isPositiveNumber(dataResolveDelay)) {
              await wait(dataResolveDelay)
            }

            if (errorAtStep === i) {
              log(`pushing error at ${i}`)
              reject(new Error(`error at step ${i}`))
            } else {
              log(`pushing data ${i}`)
              resolve(iteratorResult(chunk))
            }
          }))
        } catch (e) {
          log(`consumer rejected at step ${i}`)
          log(e)

          return
        }
        ++i
      }

      log(`pushing complete`)
      try {
        await consumer(doneAsyncIteratorResult())
      } catch {
        log(`consumer rejected at complete`)
      }
    }
  }

export default pushProducer
