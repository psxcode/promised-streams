/**
 * Small dependency-free helpers inlined from the previously external
 * `circularr`, `iterama`, `node-streams` and `@psxcode/wait` packages.
 */

import type { ReadableStream } from './types.ts'

const createData = <T>(length: number): (T | undefined)[] =>
  Array.from({ length }, () => undefined as T | undefined)

export class FixedArray<T> {
  #data: (T | undefined)[]
  #index = 0

  constructor(length: number) {
    this.#data = createData<T>(length)
  }

  static from<T>(source: readonly T[]): FixedArray<T> {
    const array = new FixedArray<T>(source.length)

    for (let i = 0; i < source.length; ++i) {
      array.#data[i] = source[i]
    }

    return array
  }

  get length(): number {
    return this.#data.length
  }

  *[Symbol.iterator](): Generator<T, void, unknown> {
    for (let i = 0; i < this.#data.length; ++i) {
      yield this.#data[(i + this.#index) % this.#data.length] as T
    }
  }

  clear(): this {
    this.#data = createData<T>(this.#data.length)
    this.#index = 0

    return this
  }

  shift(value: T): T {
    const returnValue = this.#data[this.#index] as T

    this.#data[this.#index] = value
    this.#index = (this.#index + 1) % this.#data.length

    return returnValue
  }

  trim(): FixedArray<T> {
    const data = Array.from(this)
    let startIndex = 0
    let endIndex = data.length

    for (let i = 0; i < data.length; ++i) {
      if (data[i] !== undefined) {
        break
      }

      ++startIndex
    }

    for (let i = data.length - 1; i >= 0; --i) {
      if (data[i] !== undefined) {
        break
      }

      --endIndex
    }

    return FixedArray.from(data.slice(startIndex, endIndex))
  }
}

export function* iterate<T>(iterable: Iterable<T>): Generator<T> {
  yield* iterable
}

export const waitTime =
  (cb: () => void) =>
  (ms = 0): (() => void) => {
    const id = setTimeout(cb, ms)

    return () => {
      clearTimeout(id)
    }
  }

export const waitTimePromise = (ms = 0): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

export type AsyncObserver<T> = {
  next(value: T): void | Promise<void>
  error?(error: unknown): void | Promise<void>
  complete?(): void | Promise<void>
}

/**
 * Subscribes to a readable stream and drives an async observer, respecting
 * backpressure by awaiting each `next` call before reading the next chunk.
 */
export const subscribeAsync =
  <T>(observer: AsyncObserver<T>) =>
  (stream: ReadableStream): (() => void) => {
    let promise: Promise<void> = Promise.resolve()
    let consumerRejected = false
    let inProgress = false

    const unsubscribe = (): void => {
      consumerRejected = true
      stream.removeListener('readable', onReadable)
      stream.removeListener('error', onError)
      stream.removeListener('end', onComplete)
    }

    const onReadable = async (): Promise<void> => {
      if (inProgress || consumerRejected) {
        return
      }

      inProgress = true

      while (true) {
        if (consumerRejected) {
          break
        }

        const chunk = stream.read()

        if (chunk === null) {
          break
        }

        promise = promise.then(() => observer.next(chunk as T)).catch(unsubscribe)
        await promise
      }

      inProgress = false

      if (!consumerRejected) {
        setImmediate(onReadable)
      }
    }

    const onError = (error: unknown): void => {
      promise = promise.then(() => observer.error?.(error)).catch(unsubscribe)
    }

    const onComplete = (): void => {
      promise = promise.then(() => {
        unsubscribe()

        return observer.complete?.()
      })
    }

    stream.on('readable', onReadable)
    stream.on('error', observer.error ? onError : () => {})
    stream.once('end', onComplete)

    return unsubscribe
  }
