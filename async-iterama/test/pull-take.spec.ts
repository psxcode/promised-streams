import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pullConsumer, pullProducer } from 'async-iterama-test/src'
import { pullTake } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')

describe('[ pullTake ]', () => {
  it('should work with positive numbers', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullTake(2)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with positive overflow numbers', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullTake(10)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with negative numbers', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullTake(-2)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with negative overflow numbers', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullTake(-10)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with 0 take', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullTake(0)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullTake(2)
    const r = pullProducer({ log: producerLog, errorAtStep: 1 })(data)

    try {
      await w(t(r))
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullTake(-2)
    const r = pullProducer({ log: producerLog, errorAtStep: 3 })(data)

    try {
      await w(t(r))
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 2, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })

  it('should skip producer error', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullTake(-2)
    const r = pullProducer({ log: producerLog, errorAtStep: 1 })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver producer error to consumer and continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pullTake(2)
    const r = pullProducer({ log: producerLog, errorAtStep: 0 })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver producer error to consumer and continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pullTake(-2)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullTake(2)
    const r = pullProducer({ log: producerLog, crashAtStep: 1 })(data)

    try {
      await w(t(r))
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })

  it('should handle producer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullTake(-2)
    const r = pullProducer({ log: producerLog, crashAtStep: 3 })(data)

    try {
      await w(t(r))
    } catch {
      expect(spy.calls).deep.eq([])

      return
    }

    expect.fail('should not get here')
  })
})
