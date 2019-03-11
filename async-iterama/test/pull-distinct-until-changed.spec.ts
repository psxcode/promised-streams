import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pullConsumer, pullProducer } from 'async-iterama-test/src'
import { pullDistinctUntilChanged } from '../src'

const consumerLog = debug('ai:consumer')
const producerLog = () => debug(`ai:producer`)
const sinkLog = debug('ai:sink')

describe('[ pullDistinctUntilChanged ]', () => {
  it('should work', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog() })(data)
    const t = pullDistinctUntilChanged

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with async predicate', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog() })(data)
    const t = pullDistinctUntilChanged

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
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog(), errorAtStep: 2 })(data)
    const t = pullDistinctUntilChanged

    try {
      await w(t(r))

      expect.fail('should not get here')
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
        [{ value: 1, done: false }],
      ])
    }
  })

  it('should deliver producer error to consumer and continue', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pullProducer({ log: producerLog(), errorAtStep: 3 })(data)
    const t = pullDistinctUntilChanged

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog(), crashAtStep: 2 })(data)
    const t = pullDistinctUntilChanged

    try {
      await w(t(r))

      expect.fail('should not get here')
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
        [{ value: 1, done: false }],
      ])
    }
  })
})
