import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { waitTimePromise as wait } from '@psxcode/wait'
import { pushConsumer, pushProducer } from 'async-iterama-test/src'
import { pushSide } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const mapLog = debug('ai:side-effect')
const sinkLog = debug('ai:sink')
const sideFn = () => {
  mapLog('side effect')
}

const asyncSideFn = async () => {
  mapLog('side effect begin')
  await wait(50)
  mapLog('side effect done')
}

const errorFn = () => {
  throw new Error('error in mapper')
}


describe('[ pushSide ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const sideSpy = fn(sideFn)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushSide(sideSpy)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])

    expect(sideSpy.calls).deep.eq([
      [0], [1], [2], [3],
    ])
  })

  it('should work with async map', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const sideSpy = fn(asyncSideFn)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushSide(sideSpy)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])

    expect(sideSpy.calls).deep.eq([
      [0], [1], [2], [3],
    ])
  })

  it('should deliver consumer cancel', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const sideSpy = fn(sideFn)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)
    const t = pushSide(sideSpy)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
    ])

    expect(sideSpy.calls).deep.eq([
      [0], [1],
    ])
  })

  it('should deliver consumer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const sideSpy = fn(sideFn)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const t = pushSide(sideSpy)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
    ])

    expect(sideSpy.calls).deep.eq([
      [0], [1],
    ])
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const sideSpy = fn(sideFn)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushSide(sideSpy)
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
    ])

    expect(sideSpy.calls).deep.eq([
      [0], [1],
    ])
  })

  it('should deliver side-effect function error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const sideSpy = fn(errorFn)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushSide(sideSpy)
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([])
  })
})
