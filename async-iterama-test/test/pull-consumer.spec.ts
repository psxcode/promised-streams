import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pullProducer, pullConsumer } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ait:producer')
const consumerLog = debug('ait:consumer')
const sinkLog = debug('ait:sink')

describe('[ pull-consumer / pull-producer ]', () => {
  it('should work', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer()(data)
    const w = pullConsumer()(spy)

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer data prepare delay', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, dataPrepareDelay: 50 })(data)
    const w = pullConsumer({ log: consumerLog })(spy)

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer data resolve delay', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, dataResolveDelay: 50 })(data)
    const w = pullConsumer({ log: consumerLog })(spy)

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle data consume delay', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog })(data)
    const w = pullConsumer({ log: consumerLog, delay: 50 })(spy)

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, crashAtStep: 0 })(data)
    const w = pullConsumer({ log: consumerLog })(spy)

    try {
      await w(r)
    } catch {
      expect(spy.calls).deep.eq([])

      return
    }

    expect.fail('should not get here')
  })

  it('should handle producer crash on complete', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, crashAtStep: 2 })(data)
    const w = pullConsumer({ log: consumerLog })(spy)

    try {
      await w(r)
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
        [{ value: 1, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })

  it('should handle producer error', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, errorAtStep: 0 })(data)
    const w = pullConsumer({ log: consumerLog })(spy)

    try {
      await w(r)
    } catch {
      expect(spy.calls).deep.eq([])

      return
    }

    expect.fail('should not get here')
  })

  it('should handle producer error on complete', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)
    const w = pullConsumer({ log: consumerLog })(spy)

    try {
      await w(r)
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
        [{ value: 1, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })

  it('should handle delayed producer error', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, errorAtStep: 0, dataResolveDelay: 50 })(data)
    const w = pullConsumer({ log: consumerLog })(spy)

    try {
      await w(r)
    } catch {
      expect(spy.calls).deep.eq([])

      return
    }

    expect.fail('should not get here')
  })

  it('should handle producer error and continue', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pullProducer({ log: producerLog, errorAtStep: 0 })(data)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
