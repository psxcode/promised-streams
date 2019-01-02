export type AsyncIteratorResult <T> = Promise<IteratorResult<T>>

export type Signal = number & { __signal__: any }

export const SOK = 0 as Signal
export const SCANCEL = 1 as Signal

export type PassiveConsumer <T> = (value: IteratorResult<T>) => Signal
export type AsyncPassiveConsumer <T> = (value: AsyncIteratorResult<T>) => Promise<Signal>

export type ActiveProducer <T> = (consumer: PassiveConsumer<T>) => void
export type AsyncActiveProducer <T> = (consumer: AsyncPassiveConsumer<T>) => Promise<void>

export type PassiveProducer <T> = () => IteratorResult<T>
export type AsyncPassiveProducer <T> = () => AsyncIteratorResult<T>

export type ActiveConsumer <T> = (producer: PassiveProducer<T>) => void
export type AsyncActiveConsumer <T> = (producer: AsyncPassiveProducer<T>) => void

export type IAsyncPool <T> = {
  push: AsyncPassiveConsumer<T>
  pull: AsyncPassiveProducer<T>
}
