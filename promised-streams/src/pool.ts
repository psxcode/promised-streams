import { IPool, IPoolOptions } from './types'
import noop from './noop'
import isPositiveNumber from './is-positive-number'

const defaultOptions = {
  highWatermark: 0,
}

const pool = <T> ({ highWatermark }: IPoolOptions = defaultOptions): IPool<T> => {
  const values: Promise<IteratorResult<T>>[] = []
  let consumerCancel: Promise<void> | undefined = undefined
  let producerResolve: ((arg?: any) => void) | undefined = undefined
  let consumerResolve: ((arg?: any) => void) | undefined = undefined

  return {
    async push (result) {
      try {
        await result
      } catch {
        /* cancel producer immediately */
        (consumerCancel = Promise.reject()).catch(noop)
      }

      values.push(result)

      if (consumerResolve) {
        consumerResolve(values.shift()!)
        consumerResolve = undefined
      }

      if (consumerCancel) {
        return consumerCancel
      }

      if (isPositiveNumber(highWatermark) && values.length > 0 && values.length >= highWatermark) {
        return new Promise((resolve) => {
          producerResolve = resolve
        })
      }
    },
    pull () {
      if (values.length > 0) {
        if (producerResolve) {
          setImmediate(producerResolve)
          producerResolve = undefined
        }

        return values.shift()!
      }

      return new Promise((resolve) => {
        consumerResolve = resolve
      })
    },
  }
}

export default pool
