import { subscribeAsync } from 'node-streams'
import { PushProducer } from './types'
import { doneAsyncIteratorResult, errorAsyncIteratorResult, asyncIteratorResult } from './helpers'

const pushFromStream = <T> (stream: NodeJS.ReadableStream): PushProducer<T> =>
  (consumer) => new Promise((resolve) => {
    const onReject = () => {
      unsub()
      resolve()
    }
    const unsub = subscribeAsync({
      next (value) {
        return consumer(asyncIteratorResult(value)).catch(onReject)
      },
      error (e) {
        return consumer(errorAsyncIteratorResult(e)).catch(onReject)
      },
      complete () {
        consumer(doneAsyncIteratorResult()).then(resolve, resolve)
      },
    })(stream)
  })

export default pushFromStream
