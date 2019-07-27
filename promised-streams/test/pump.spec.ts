import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pushConsumer, pullProducer } from 'promised-streams-test/src'
import { pump } from '../src'
import { makeNumbers } from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')

describe('[ pump ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog })(data)

    await pump(r)(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver consumer cancel', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)
    const r = pullProducer({ log: producerLog })(data)

    await pump(r)(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
    ])
  })

  it('should handle consumer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const r = pullProducer({ log: producerLog })(data)

    await pump(r)(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
    ])
  })

  it('should handle producer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog, crashAtStep: 1 })(data)

    await pump(r)(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
    ])
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    await pump(r)(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
    ])
  })

  it('should deliver producer error to consumer and continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    await pump(r)(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
