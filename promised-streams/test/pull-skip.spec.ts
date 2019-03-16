import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pullConsumer, pullProducer } from 'promised-streams-test/src'
import { pullSkip } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')

describe('[ pullSkip ]', () => {
  it('should work with positive numbers', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSkip(2)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with positive overflow numbers', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSkip(10)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with negative numbers', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSkip(-2)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with negative overflow numbers', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSkip(-10)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with 0 skip', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSkip(0)
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

  it('should handle producer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSkip(2)
    const r = pullProducer({ log: producerLog, crashAtStep: 3 })(data)

    try {
      await w(t(r))
      expect.fail('should not get here')
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 2, done: false }],
      ])
    }
  })

  it('should handle producer crash on complete', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSkip(2)
    const r = pullProducer({ log: producerLog, crashAtStep: 4 })(data)

    try {
      await w(t(r))
      expect.fail('should not get here')
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 2, done: false }],
        [{ value: 3, done: false }],
      ])
    }
  })

  it('should handle producer crash on negative', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSkip(-2)
    const r = pullProducer({ log: producerLog, crashAtStep: 1 })(data)

    try {
      await w(t(r))
      expect.fail('should not get here')
    } catch {
      /* cannot get 'done' value */
      expect(spy.calls).deep.eq([])
    }
  })

  it('should handle producer crash on negative on complete', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSkip(-2)
    const r = pullProducer({ log: producerLog, crashAtStep: 2 })(data)

    try {
      await w(t(r))
      expect.fail('should not get here')
    } catch {
      /* cannot get 'done' value */
      expect(spy.calls).deep.eq([])
    }
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSkip(1)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    try {
      await w(t(r))
      expect.fail('should not get here')
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 1, done: false }],
      ])
    }
  })

  it('should deliver producer error to consumer on complete', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSkip(2)
    const r = pullProducer({ log: producerLog, errorAtStep: 4 })(data)

    try {
      await w(t(r))
      expect.fail('should not get here')
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 2, done: false }],
        [{ value: 3, done: false }],
      ])
    }
  })

  it('should deliver producer error to consumer on negative', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSkip(-2)
    const r = pullProducer({ log: producerLog, errorAtStep: 3 })(data)

    try {
      await w(t(r))
      expect.fail('should not get here')
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
      ])
    }
  })

  it('should deliver producer error to consumer on negative on complete', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSkip(-2)
    const r = pullProducer({ log: producerLog, errorAtStep: 4 })(data)

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

  it('should skip producer error', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSkip(2)
    const r = pullProducer({ log: producerLog, errorAtStep: 0 })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should NOT skip producer error on negative', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullSkip(-2)
    const r = pullProducer({ log: producerLog, errorAtStep: 3 })(data)

    try {
      await w(t(r))
      expect.fail('should not get here')
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
      ])
    }
  })

  it('should deliver producer error to consumer and continue on negative', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pullSkip(-1)
    const r = pullProducer({ log: producerLog, errorAtStep: 0 })(data)

    try {
      await w(t(r))
      expect.fail('should not get here')
    } catch {
      expect(spy.calls).deep.eq([])
    }
  })
})
