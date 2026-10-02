import { waitTimePromise as wait } from './internal.ts'
import type { PushProducer } from 'promised-streams'
import { iteratorResult, doneAsyncIteratorResult, errorAsyncIteratorResult } from './helpers.ts'
import { noop } from './noop.ts'
import { isPositiveNumber } from './is-positive-number.ts'

export type PushProducerOptions = {
  log?: typeof console.log
  dataResolveDelay?: number
  dataPrepareDelay?: number
  errorAtStep?: number
}

export const pushProducer =
  ({ log = noop, dataResolveDelay, dataPrepareDelay, errorAtStep }: PushProducerOptions = {}) =>
  <T>(data: Iterable<T>): PushProducer<T> => {
    let i = 0

    return async (consumer) => {
      for (const chunk of data) {
        try {
          if (isPositiveNumber(dataPrepareDelay)) {
            log(`preparing data ${i}`)
            await wait(dataPrepareDelay)
          }

          await consumer(
            (async () => {
              if (isPositiveNumber(dataResolveDelay)) {
                await wait(dataResolveDelay)
              }

              if (errorAtStep === i) {
                log(`pushing error at ${i}`)

                throw new Error(`error at step ${i}`)
              }

              log(`pushing data ${i}`)

              return iteratorResult(chunk)
            })(),
          )
        } catch (e) {
          log(`consumer rejected at step ${i}`)
          log(e)

          return
        }
        ++i
      }

      /* done */
      log(i === errorAtStep ? 'pushing error at complete' : 'pushing complete')

      let result: Promise<IteratorResult<T>>
      ;(result =
        i === errorAtStep
          ? errorAsyncIteratorResult(new Error(`error at complete`))
          : doneAsyncIteratorResult()).catch(noop)

      let consumerResult: Promise<void> | undefined = undefined
      try {
        consumerResult = consumer(result)
      } catch {
        log(`consumer crashed at complete`)

        return
      }

      try {
        await consumerResult
      } catch {
        log(`consumer rejected at complete`)

        return
      }
    }
  }
