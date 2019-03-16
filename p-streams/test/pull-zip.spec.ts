import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pullConsumer, pullProducer } from 'p-streams-test/src'
import { pullZip } from '../src'
import makeNumbers from './make-numbers'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')
let logIndex = 0
const producerLog = () => debug(`ai:producer${logIndex++}`)

describe('[ pullZip ]', () => {
  it('should work', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog() })(data1)
    const t = pullZip

    await w(t(r0, r1))

    expect(spy.calls).deep.eq([
      [{ value: [0, 0], done: false }],
      [{ value: [1, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with single producer', async () => {
    const data0 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog() })(data0)
    const t = pullZip

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: [0], done: false }],
      [{ value: [1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with no producers', async () => {
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullZip

    await w(t())

    expect(spy.calls).deep.eq([
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer delay', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, delay: 30 })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog() })(data1)
    const t = pullZip

    await w(t(r0, r1))

    expect(spy.calls).deep.eq([
      [{ value: [0, 0], done: false }],
      [{ value: [1, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should propagate producer error to consumer', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog(), errorAtStep: 0 })(data1)
    const t = pullZip

    try {
      await w(t(r0, r1))

      expect.fail('should not get here')
    } catch {
      expect(spy.calls).deep.eq([])
    }
  })

  it('should propagate producer error to consumer and continue', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog(), errorAtStep: 0 })(data1)
    const t = pullZip

    await w(t(r0, r1))

    expect(spy.calls).deep.eq([
      [{ value: [1, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r0 = pullProducer({ log: producerLog() })(data0)
    const r1 = pullProducer({ log: producerLog(), crashAtStep: 0 })(data1)
    const t = pullZip

    try {
      await w(t(r0, r1))

      expect.fail('should not get here')
    } catch {
      expect(spy.calls).deep.eq([])
    }
  })
})
