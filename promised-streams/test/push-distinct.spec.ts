import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { waitTimePromise as wait } from '@psxcode/wait'
import { pushConsumer, pushProducer } from 'promised-streams-test/src'
import { pushDistinct } from '../src'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const mapLog = debug('ai:filter')
const sinkLog = debug('ai:sink')
const notEqual = (a: number, b: number) => {
  mapLog('filtering value')

  return a !== b
}

const asyncNotEqual = async (a: number, b: number) => {
  mapLog('filtering value begin')
  await wait(50)
  mapLog('filtering value done')

  return a !== b
}

const errorFn = () => {
  throw new Error('error in predicate')
}


describe('[ pushDistinct ]', () => {
  it('should work', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDistinct(notEqual)
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
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDistinct(asyncNotEqual)
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
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)
    const t = pushDistinct(notEqual)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
    ])
  })

  it('should handle consumer crash', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const t = pushDistinct(notEqual)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
    ])
  })

  it('should deliver producer error to consumer', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDistinct(notEqual)
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
    ])
  })

  it('should deliver predicate error to consumer', async () => {
    const data = [0, 1, 1, 2, 3, 3, 3]
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushDistinct(errorFn)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([])
  })
})
