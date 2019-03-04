import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pullConsumer, pullProducer } from 'async-iterama-test/src'
import { pullStartWith } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')

describe('[ pullStartWith ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullStartWith(-1)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: -1, done: false }],
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with multiple values', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullStartWith(-3, -2, -1)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: -3, done: false }],
      [{ value: -2, done: false }],
      [{ value: -1, done: false }],
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with no values', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullStartWith()
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

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullStartWith(32)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    try {
      await w(t(r))
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 32, done: false }],
        [{ value: 0, done: false }],
        [{ value: 1, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })

  it('should deliver producer error to consumer and continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pullStartWith(32)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 32, done: false }],
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullStartWith(32)
    const r = pullProducer({ log: producerLog, crashAtStep: 2 })(data)

    try {
      await w(t(r))
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 32, done: false }],
        [{ value: 0, done: false }],
        [{ value: 1, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })
})
