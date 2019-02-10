// import ReadableStream = NodeJS.ReadableStream
// import { subscribe, subscribeAsync } from 'node-streams'
// import { AsyncPushProducer, PushProducer, SOK, AsyncPullProducer } from './types'
// import { doneAsyncIteratorResult, doneIteratorResult, iteratorResult } from './helpers'

// export const pushStream = <T> (stream: ReadableStream): PushProducer<T> => (consumer) => {
//   const unsubscribe = subscribe({
//     next (value) {
//       consumer(iteratorResult(value)) === SOK || unsubscribe()
//     },
//     complete () {
//       consumer(doneIteratorResult())
//     },
//   })(stream)
// }

// export const pushStreamAsync = <T> (stream: ReadableStream): AsyncPushProducer<T> => (consumer) =>
//   new Promise((resolve, reject) => {
//     const unsubscribe = subscribeAsync({
//       async next ({ value }) {
//         (await consumer(value)) === SOK || unsubscribe()
//       },
//       async error (e) {
//         await consumer(doneAsyncIteratorResult())
//         reject(e)
//       },
//       async complete () {
//         await consumer(doneAsyncIteratorResult())
//         resolve()
//       },
//     })(stream)
//   })

// // export const pullAsync = <T> (stream: ReadableStream): AsyncPullProducer<T> => {
// //   const it = iterate(iterable)

// //   return () => Promise.resolve(it.next())
// // }
