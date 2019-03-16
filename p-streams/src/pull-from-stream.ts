import { subscribeAsync } from 'node-streams'
import { PullProducer } from './types'
import { doneAsyncIteratorResult, errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

const pullFromStream = <T> (stream: NodeJS.ReadableStream): PullProducer<T> => {
  let hasValue: (() => void) | undefined = undefined
  const values: (() => Promise<IteratorResult<T>>)[] = []

  subscribeAsync({
    next (value) {
      return new Promise((resolve) => {
        values.push(() => (resolve(), asyncIteratorResult(value)))
        hasValue && hasValue()
      })
    },
    error (e) {
      return new Promise((resolve) => {
        values.push(() => (resolve(), errorAsyncIteratorResult(e)))
        hasValue && hasValue()
      })
    },
    complete () {
      return new Promise((resolve) => {
        values.push(() => (resolve(), doneAsyncIteratorResult()))
        hasValue && hasValue()
      })
    },
  })(stream)

  return () => new Promise((resolve) => {
    if (values.length > 0) {
      resolve()
    } else {
      hasValue = resolve
    }
  }).then(() => values.shift()!())
}

export default pullFromStream
