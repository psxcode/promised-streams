import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pushConsumer } from 'promise-streams-test/src'
import { readable } from 'node-stream-test'
import { pushFromStream } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')

describe('[ pushFromStream ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushFromStream(
      readable({ log: producerLog, eager: true })({ objectMode: true })(data)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('slow stream', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushFromStream(
      readable({ log: producerLog, eager: false, delayMs: 50 })({ objectMode: true })(data)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('slow consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, delay: 50 })(spy)
    const r = pushFromStream(
      readable({ log: producerLog, eager: false })({ objectMode: true })(data)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('error handling - consumer break / stream break', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushFromStream(
      readable({ log: producerLog, eager: true, errorAtStep: 2 })({ objectMode: true })(data)
    )

    await r(w)

    /* stream does not deliver data immediately, but error does */
    expect(spy.calls).deep.eq([])
  })

  it('error handling - consumer break / stream continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushFromStream(
      readable({ log: producerLog, eager: true, errorAtStep: 2, continueOnError: true })({ objectMode: true })(data)
    )

    await r(w)

    /* stream does not deliver data immediately, but error does */
    expect(spy.calls).deep.eq([])
  })

  it('error handling - consumer continue / stream break', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pushFromStream(
      readable({ log: producerLog, eager: true, errorAtStep: 2 })({ objectMode: true })(data)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('error handling - consumer continue / stream continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pushFromStream(
      readable({ log: producerLog, eager: true, errorAtStep: 2, continueOnError: true })({ objectMode: true })(data)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('consumer cancel', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)
    const r = pushFromStream(
      readable({ log: producerLog, eager: true })({ objectMode: true })(data)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
    ])
  })

  it('consumer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const r = pushFromStream(
      readable({ log: producerLog, eager: true })({ objectMode: true })(data)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
    ])
  })
})
