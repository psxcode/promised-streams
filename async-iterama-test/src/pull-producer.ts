import { waitTimePromise as wait } from '@psxcode/wait'
import { iterate } from 'iterama'
import { PullProducer } from './types'
import noop from './noop'
import isPositiveNumber from './is-positive-number'

export type PullProducerOptions = {
  log?: typeof console.log,
  dataResolveDelay?: number,
  dataPrepareDelay?: number,
  errorAtStep?: number,
}

const pullProducer = ({ log = noop, dataPrepareDelay, dataResolveDelay, errorAtStep }: PullProducerOptions = {}) =>
  <T> (data: Iterable<T>): PullProducer<T> => {
    let i = 0
    const it = iterate(data)

    return async () => {
      log(`value requested at step ${i}`)

      if (isPositiveNumber(dataPrepareDelay)) {
        await wait(dataPrepareDelay)
      }

      const ir = it.next()

      if (errorAtStep === i) {
        log(`returning error at step ${i++}`)

        return new Promise(async (_, reject) => {
          if (isPositiveNumber(dataResolveDelay)) {
            await wait(dataResolveDelay)
          }

          reject(new Error('producer error'))
        })
      }

      log(ir.done
        ? `returning done at step ${i++}`
        : `returning chunk ${i++}`)

      return new Promise(async (resolve) => {
        if (isPositiveNumber(dataResolveDelay)) {
          await wait(dataResolveDelay)
        }

        resolve(ir)
      })
    }
  }

export default pullProducer
