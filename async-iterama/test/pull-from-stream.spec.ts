import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pullConsumer } from 'async-iterama-test/src'
import { readable } from 'node-stream-test'
import { pullFromStream } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')

describe('[ pullFromStream ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullFromStream(
      readable({ log: producerLog, eager: true })({ objectMode: true })(data)
    )

    await w(r)

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
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullFromStream(
      readable({ log: producerLog, eager: false, delayMs: 50 })({ objectMode: true })(data)
    )

    await w(r)

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
    const w = pullConsumer({ log: consumerLog, delay: 50 })(spy)
    const r = pullFromStream(
      readable({ log: producerLog, eager: false })({ objectMode: true })(data)
    )

    await w(r)

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
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullFromStream(
      readable({ log: producerLog, eager: true, errorAtStep: 2 })({ objectMode: true })(data)
    )

    try {
      await w(r)
    } catch {
      /* stream does not deliver data immediately, but error does */
      expect(spy.calls).deep.eq([])

      return
    }

    expect.fail('should not get here')
  })

  it('error handling - consumer break / stream continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullFromStream(
      readable({ log: producerLog, eager: true, errorAtStep: 2, continueOnError: true })({ objectMode: true })(data)
    )

    try {
      await w(r)
    } catch {
      /* stream does not deliver data immediately, but error does */
      expect(spy.calls).deep.eq([])

      return
    }

    expect.fail('shoudl not get here')
  })

  it('error handling - consumer continue / stream break', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pullFromStream(
      readable({ log: producerLog, eager: true, errorAtStep: 2 })({ objectMode: true })(data)
    )

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('error handling - consumer continue / stream continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pullFromStream(
      readable({ log: producerLog, eager: true, errorAtStep: 2, continueOnError: true })({ objectMode: true })(data)
    )

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
