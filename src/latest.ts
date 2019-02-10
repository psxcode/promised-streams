// import { AsyncIteratorResult, IPool } from './types'

// export const latest = <T> (): IPool<T> => {
//   let data: AsyncIteratorResult<T>
//   let onData: (() => void) | undefined
//   let pullPromise: AsyncIteratorResult<T> | undefined
//   const doResolve = (res: any) => {
//     onData = pullPromise = undefined
//     res(data)
//   }

//   return {
//     push (value: AsyncIteratorResult<T>) {
//       data = value
//       onData && onData()

//       return Promise.resolve(true)
//     },
//     pull (): AsyncIteratorResult<T> {
//       return pullPromise || data ||
//         (pullPromise = new Promise((res) => {
//           data
//             ? doResolve(res)
//             : onData = () => doResolve(res)
//         }))
//     },
//   }
// }
