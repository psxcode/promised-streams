import { AsyncIteratorResult, IPool } from './types'
import { doneAsyncIteratorResult } from './helpers'
import noop from './noop'

const pool = <T> (): IPool<T> => {
  const values: AsyncIteratorResult<T>[] = []
  let consumeValue: (() => void) | undefined
  let consumerCancel: Promise<void> | undefined = undefined
  let done = false

  const prepareConsumeValue = (resolve: (value: any) => void) => () => {
    consumeValue = undefined
    resolve(values.shift()!)
  }

  return {
    async push (result) {
      if (consumerCancel) {
        return consumerCancel
      }

      try {
        done = (await result).done
      } catch {
        /* store error */
        done = true

        /* cancel producer immediately */
        ;(consumerCancel = Promise.reject()).catch(noop)
      }

      values.push(result)
      consumeValue && consumeValue()

      if (consumerCancel) {
        return consumerCancel
      }
    },
    pull () {
      if (done && values.length === 0) {
        return doneAsyncIteratorResult()
      }

      if (values.length > 0) {
        return values.shift()!
      }

      return new Promise((resolve) => {
        if (values.length > 0) {
          resolve(values.shift()!)
        }

        consumeValue = prepareConsumeValue(resolve)
      })
    },
  }
}

export default pool
