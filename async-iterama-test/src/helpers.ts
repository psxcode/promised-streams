import { AsyncIteratorResult } from './types'

export const iteratorResult = <T> (value: T): IteratorResult<T> => ({ value, done: false })

export const doneIteratorResult = () => ({ value: undefined, done: true }) as IteratorResult<any>

export const asyncIteratorResult = <T> (value: T): AsyncIteratorResult<T> =>
  Promise.resolve({ value, done: false })

export const errorAsyncIteratorResult = (err?: any): AsyncIteratorResult<any> => Promise.reject(err)

export const doneAsyncIteratorResult = (): AsyncIteratorResult<any> => Promise.resolve(doneIteratorResult())
