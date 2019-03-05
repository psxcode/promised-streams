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
  crashAtStep?: number,
}

const pullProducer = ({ log = noop, dataPrepareDelay, dataResolveDelay, errorAtStep, crashAtStep }: PullProducerOptions = {}) =>
  <T> (data: Iterable<T>): PullProducer<T> => {
    let i = 0
    const it = iterate(data)

    const getNextValue = (): Promise<IteratorResult<T>> => {
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

    return () => {
      log(`value requested at step ${i}`)

      if (i === crashAtStep) {
        log(`crashing at ${i}`)
        ++i

        throw new Error(`producer crash at step ${i}`)
      }

      if (isPositiveNumber(dataPrepareDelay)) {
        return wait(dataPrepareDelay).then(getNextValue)
      }

      return getNextValue()
    }
  }

export default pullProducer
