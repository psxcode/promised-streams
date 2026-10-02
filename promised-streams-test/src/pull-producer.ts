import { iterate, waitTimePromise as wait } from './internal.ts'
import type { PullProducer } from 'promised-streams'
import { noop } from './noop.ts'
import { isPositiveNumber } from './is-positive-number.ts'

export type PullProducerOptions = {
  log?: typeof console.log
  dataResolveDelay?: number
  dataPrepareDelay?: number
  errorAtStep?: number
  crashAtStep?: number
}

export const pullProducer =
  ({
    log = noop,
    dataPrepareDelay,
    dataResolveDelay,
    errorAtStep,
    crashAtStep,
  }: PullProducerOptions = {}) =>
  <T>(data: Iterable<T>): PullProducer<T> => {
    let i = 0
    const it = iterate(data)

    const getNextValue = (): Promise<IteratorResult<T>> => {
      const ir = it.next()

      if (errorAtStep === i) {
        log(`returning error at step ${i++}`)

        return (async () => {
          if (isPositiveNumber(dataResolveDelay)) {
            await wait(dataResolveDelay)
          }

          throw new Error('producer error')
        })()
      }

      log(ir.done ? `returning done at step ${i++}` : `returning chunk ${i++}`)

      return (async () => {
        if (isPositiveNumber(dataResolveDelay)) {
          await wait(dataResolveDelay)
        }

        return ir
      })()
    }

    return () => {
      log(`value requested at step ${i}`)

      if (i === crashAtStep) {
        log(`crashing at ${i}`)

        /* do not increment index here, to simulate consistent crashing */
        // ++i

        throw new Error(`producer crash at step ${i}`)
      }

      if (isPositiveNumber(dataPrepareDelay)) {
        return wait(dataPrepareDelay).then(getNextValue)
      }

      return getNextValue()
    }
  }
