import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pushProducer, pushConsumer } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ait:producer')
const consumerLog = debug('ait:consumer')
const sinkLog = debug('ait:sink')

describe('[ push-producer / push-consumer ]', () => {
  it('should work', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer()(data)
    const w = pushConsumer()(spy)

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer data resolve delay', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog, dataResolveDelay: 50 })(data)
    const w = pushConsumer({ log: consumerLog })(spy)

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer data prepare delay', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog, dataPrepareDelay: 50 })(data)
    const w = pushConsumer({ log: consumerLog })(spy)

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer delay', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog })(data)
    const w = pushConsumer({ log: consumerLog, delay: 50 })(spy)

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer error', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog, errorAtStep: 1 })(data)
    const w = pushConsumer({ log: consumerLog })(spy)

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
    ])
  })

  it('should be able to continue on producer error', async () => {
    const data = makeNumbers(3)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog, errorAtStep: 1 })(data)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 2, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer crash', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog })(data)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
    ])
  })

  it('should handle consumer cancel', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const r = pushProducer({ log: producerLog })(data)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
    ])
  })
})
