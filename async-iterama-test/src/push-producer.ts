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

const pushProducer = ({ log = noop, dataResolveDelay, dataPrepareDelay, errorAtStep }: PushProducerOptions = {}) => <T>(data: Iterable<T>): PushProducer<T> => {
  let i = 0

  return async (consumer) => {
    for (const chunk of data) {
      try {
        if (isPositiveNumber(dataPrepareDelay)) {
          await wait(dataPrepareDelay)
        }

        await consumer(new Promise(async (resolve, reject) => {
          log(`pushing data ${i}`)
          if (isPositiveNumber(dataResolveDelay)) {
            await wait(dataResolveDelay)
          }

          if (errorAtStep === i) {
            reject(new Error(`error at step ${i}`))
          } else {
            resolve(iteratorResult(chunk))
          }

          ++i
        }))
      } catch (e) {
        log(`consumer rejected at step ${i}`)
        throw e
      }
    }

    log(`pushing complete at ${i}`)
    await consumer(doneAsyncIteratorResult())
  }
}

export default pushProducer
