import { PullProducer } from './types'
import { racePromises, asyncIteratorResult, errorAsyncIteratorResult } from './helpers'
import noop from './noop'

const isValid = (obj: any) => !!obj

function pullWithLatest (): <T>(main: PullProducer<T>) => PullProducer<[T]>
function pullWithLatest <T1>(p1: PullProducer<T1>): <T>(main: PullProducer<T>) => PullProducer<[T, T1]>
function pullWithLatest <T1, T2>(p1: PullProducer<T1>, p2: PullProducer<T2>): <T>(main: PullProducer<T>) => PullProducer<[T, T1, T2]>
function pullWithLatest <T1, T2, T3>(p1: PullProducer<T1>, p2: PullProducer<T2>, p3: PullProducer<T3>): <T>(main: PullProducer<T>) => PullProducer<[T, T1, T2, T3]>

function pullWithLatest (...producers: PullProducer<any>[]) {
  return (mainProducer: PullProducer<any>): PullProducer<any[]> => {
    const activeProducers: (PullProducer<any> | null)[] = producers.slice()
    const values: any[] = producers.map(() => undefined)
    const promises: (Promise<IteratorResult<any>> | null)[] = producers.map(() => null)
    const producerErrors: Promise<IteratorResult<any>>[] = []
    let isInit = false
    let done = false
    const race = racePromises()

    const pullFromProducers = async () => {
      while (!done && activeProducers.some(isValid)) {
        let ir: IteratorResult<any>
        let index: number

        for (let i = 0; i < activeProducers.length; ++i) {
          const producer = activeProducers[i]
          if (promises[i] === null && producer !== null) {
            try {
              promises[i] = producer()
            } catch (e) {
              let err: Promise<IteratorResult<any>>
              (err = errorAsyncIteratorResult(e)).catch(noop)
              producerErrors.push(err)
              activeProducers[i] = null
              promises[i] = null

              continue
            }
          }
        }

        try {
          [ir, index] = await race(promises)
        } catch ([e, index]) {
          producerErrors.push(promises[index]!)
          activeProducers[index] = null
          promises[index] = null

          continue
        }

        promises[index] = null

        if (ir.done) {
          activeProducers[index] = null

          continue
        }

        values[index] = ir.value
      }
    }

    return async () => {
      if (producerErrors.length > 0) {
        return producerErrors.shift() as Promise<IteratorResult<any[]>>
      }

      if (!isInit) {
        isInit = true

        pullFromProducers()
      }

      const air = mainProducer()
      let ir: IteratorResult<any>
      try {
        ir = await air
      } catch {
        return air
      }

      if (ir.done) {
        done = true

        return air
      }

      return asyncIteratorResult([ir.value, ...values.slice()])
    }
  }
}

export default pullWithLatest
