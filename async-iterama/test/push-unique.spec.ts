import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pushConsumer, pushProducer } from 'async-iterama-test/src'
import { pushUnique } from '../src'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')


describe('[ pushUnique ]', () => {
  it('should work', async () => {
    const data = [0, 1, 1, 2, 3, 2, 1, 0]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushUnique
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with async predicate', async () => {
    const data = [0, 1, 1, 2, 3, 2, 1, 0]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushUnique
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver consumer cancel', async () => {
    const data = [0, 1, 1, 2, 3, 2, 1, 0]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)
    const t = pushUnique
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
    ])
  })

  it('should deliver producer error to consumer', async () => {
    const data = [0, 1, 1, 2, 3, 2, 1, 0]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushUnique
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
    ])
  })

  it('should continue after producer error', async () => {
    const data = [0, 1, 1, 2, 3, 2, 1, 0]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pushUnique
    const r = pushProducer({ log: producerLog, errorAtStep: 3 })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 3, done: false }],
      [{ value: 2, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
