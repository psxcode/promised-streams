import { waitTimePromise as wait } from '@psxcode/wait'
import { PushProducer, AsyncIteratorResult } from 'async-iterama/src'
import { iteratorResult, doneAsyncIteratorResult, errorAsyncIteratorResult } from './helpers'
import noop from './noop'
import isPositiveNumber from './is-positive-number'

export type PushProducerOptions = {
  log?: typeof console.log
  dataResolveDelay?: number,
  dataPrepareDelay?: number,
  errorAtStep?: number,
}

const pushProducer = ({ log = noop, dataResolveDelay, dataPrepareDelay, errorAtStep }: PushProducerOptions = {}) =>
  <T> (data: Iterable<T>): PushProducer<T> => {
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

      /* done */
      log(i === errorAtStep
        ? 'pushing error at complete'
        : 'pushing complete')

      let result: AsyncIteratorResult<T>
      (result = i === errorAtStep
        ? errorAsyncIteratorResult(new Error(`error at complete`))
        : doneAsyncIteratorResult()).catch(noop)

      let consumerResult: Promise<void> | undefined = undefined
      try {
        consumerResult = consumer(result)
      } catch (e) {
        log(`consumer crashed at complete`)

        return
      }

      try {
        await consumerResult
      } catch (e) {
        log(`consumer rejected at complete`)

        return
      }
    }
  }

export default pushProducer
