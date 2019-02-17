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

const pullProducer = ({ log = noop, dataPrepareDelay, dataResolveDelay, errorAtStep }: PullProducerOptions = {}) => <T> (data: Iterable<T>): PullProducer<T> => {
  let i = 0
  const it = iterate(data)

  return async () => {
    log(`value requested at step ${i}`)

    if (isPositiveNumber(dataPrepareDelay)) {
      await wait(dataPrepareDelay)
    }

    return new Promise(async (resolve, reject) => {
      const ir = it.next()

      if (isPositiveNumber(dataResolveDelay)) {
        await wait(dataResolveDelay)
      }

      if (errorAtStep === i) {
        log(`returning error at step ${i++}`)
        reject(new Error('producer error'))
      }

      log(ir.done
        ? `returning done at step ${i++}`
        : `returning chunk at step ${i++}`)

      resolve(ir)
    })
  }
}

export default pullProducer
