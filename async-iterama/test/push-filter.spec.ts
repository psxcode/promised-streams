import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { waitTimePromise as wait } from '@psxcode/wait'
import { pushConsumer, pushProducer } from 'async-iterama-test/src'
import { pushFilter } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const mapLog = debug('ai:filter')
const sinkLog = debug('ai:sink')
const isEven = (value: number) => {
  mapLog('filtering value')

  return value % 2 === 0
}

const asyncIsEven = async (value: number) => {
  mapLog('filtering value begin')
  await wait(50)
  mapLog('filtering value done')

  return value % 2 === 0
}

const errorFn = () => {
  throw new Error('error in predicate')
}


describe('[ pushFilter ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushFilter(isEven)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 2, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with async predicate', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushFilter(asyncIsEven)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 2, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver consumer cancel', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)
    const t = pushFilter(isEven)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 2, done: false }],
    ])
  })

  it('should handle consumer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const t = pushFilter(isEven)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 2, done: false }],
    ])
  })

  it('should deliver predicate error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushFilter(errorFn)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([])
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushFilter(isEven)
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
    ])
  })

  it('should deliver producer error to consumer and continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pushFilter(isEven)
    const r = pushProducer({ log: producerLog, errorAtStep: 0 })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 2, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
