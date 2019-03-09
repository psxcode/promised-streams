import { AsyncIteratorResult, IPool } from './types'
import noop from './noop'

const pool = <T> (): IPool<T> => {
  const values: AsyncIteratorResult<T>[] = []
  let consumeValue: (() => void) | undefined
  let consumerCancel: Promise<void> | undefined = undefined

  const prepareConsumeValue = (resolve: (value: any) => void) => () => {
    consumeValue = undefined
    resolve(values.shift()!)
  }

  return {
    async push (result) {
      try {
        await result
      } catch {
        /* cancel producer immediately */
        (consumerCancel = Promise.reject()).catch(noop)
      }

      values.push(result)
      consumeValue && consumeValue()

      if (consumerCancel) {
        return consumerCancel
      }
    },
    pull () {
      if (values.length > 0) {
        return values.shift()!
      }

      return new Promise((resolve) => {
        consumeValue = prepareConsumeValue(resolve)
      })
    },
  }
}

export default pool
