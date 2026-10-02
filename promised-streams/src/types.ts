export type PushConsumer<T> = (value: Promise<IteratorResult<T>>) => Promise<void>
export type PushProducer<T> = (consumer: PushConsumer<T>) => Promise<void>
export type PullProducer<T> = () => Promise<IteratorResult<T>>
export type PullConsumer<T> = (producer: PullProducer<T>) => Promise<void>

export type IPoolOptions = {
  highWatermark?: number
}

export type IPool<T> = {
  push: PushConsumer<T>
  pull: PullProducer<T>
}

export type WaitFn = (cb: () => void) => () => void
export type UnsubscribeFn = (() => void) | undefined

/**
 * Minimal structural view of a Node readable stream.
 *
 * Declared locally instead of using the global `NodeJS.ReadableStream` so the
 * published type declarations stay self-contained and do not require consumers
 * to install `@types/node`.
 */
export type ReadableStream = {
  on(event: string, listener: (...args: any[]) => void): unknown
  once(event: string, listener: (...args: any[]) => void): unknown
  removeListener(event: string, listener: (...args: any[]) => void): unknown
  read(size?: number): unknown
}
