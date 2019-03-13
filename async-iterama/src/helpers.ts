export const iteratorResult = <T> (value: T): IteratorResult<T> => ({ value, done: false })

export const doneIteratorResult = () => ({ value: undefined, done: true }) as IteratorResult<any>

export const asyncIteratorResult = <T> (value: T): Promise<IteratorResult<T>> =>
  Promise.resolve({ value, done: false })

export const errorAsyncIteratorResult = (err?: any): Promise<IteratorResult<any>> => Promise.reject(err)

export const doneAsyncIteratorResult = (): Promise<IteratorResult<any>> => Promise.resolve(doneIteratorResult())

export const racePromises = () => {
  /* rotate index offset to prevent promise index lock */
  let indexOffset = 0

  return <T>(promises: (Promise<IteratorResult<T>> | null)[]) =>
    new Promise<[IteratorResult<T>, number]>((resolve, reject) => {
      for (let i = 0; i < promises.length; ++i) {
        const promiseIndex = (i + indexOffset) % promises.length
        const promise = promises[promiseIndex]

        if (promise) {
          promise.then(
            (res) => resolve([res, promiseIndex]),
            (reason) => reject([reason, promiseIndex])
          )
        }
      }

      ++indexOffset
    })
}
