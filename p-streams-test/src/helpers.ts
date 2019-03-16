export const iteratorResult = <T> (value: T): IteratorResult<T> => ({ value, done: false })

export const doneIteratorResult = () => ({ value: undefined, done: true }) as IteratorResult<any>

export const errorAsyncIteratorResult = (err?: any): Promise<IteratorResult<any>> => Promise.reject(err)

export const doneAsyncIteratorResult = (): Promise<IteratorResult<any>> => Promise.resolve(doneIteratorResult())
