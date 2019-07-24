import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { waitTimePromise as wait } from '@psxcode/wait'
import { pushConsumer, pushProducer } from 'promised-streams-test/src'
import { pushMap, pushHoFlatten } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ai:producer')
const hoproducerLog = debug('ai:hoproducer')
const consumerLog = debug('ai:consumer')
const mapLog = debug('ai:map')
const sinkLog = debug('ai:sink')
const mult2 = (value: number) => {
  mapLog('mapping value')

  return pushProducer({ log: hoproducerLog })([value, value])
}

const amult2 = async (value: number) => {
  mapLog('mapping value begin')
  await wait(50)
  mapLog('mapping value done')

  return pushProducer({ log: hoproducerLog })([value, value])
}

const emult2 = (value: number) => {
  if (value === 0) {
    throw new Error('error in mapper')
  }

  return pushProducer({ log: hoproducerLog })([value, value])
}


describe('[ pushHoFlatten ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t0 = pushMap(mult2)
    const t1 = pushHoFlatten
    const r = pushProducer({ log: producerLog })(data)

    await r(t0(t1(w)))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with async map', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t0 = pushMap(amult2)
    const t1 = pushHoFlatten
    const r = pushProducer({ log: producerLog })(data)

    await r(t0(t1(w)))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver consumer cancel', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)
    const t0 = pushMap(mult2)
    const t1 = pushHoFlatten
    const r = pushProducer({ log: producerLog })(data)

    await r(t0(t1(w)))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 0, done: false }],
    ])
  })

  it('should handle consumer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const t0 = pushMap(mult2)
    const t1 = pushHoFlatten
    const r = pushProducer({ log: producerLog })(data)

    await r(t0(t1(w)))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
    ])
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t0 = pushMap(mult2)
    const t1 = pushHoFlatten
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)

    await r(t0(t1(w)))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 1, done: false }],
    ])
  })

  it('should deliver sub-producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t0 = pushMap((value: number) => {
      mapLog('mapping value')

      return pushProducer({ log: hoproducerLog, errorAtStep: 1 })([value, value])
    })
    const t1 = pushHoFlatten
    const r = pushProducer({ log: producerLog })(data)

    await r(t0(t1(w)))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
    ])
  })

  it('should deliver mapper error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t0 = pushMap(emult2)
    const t1 = pushHoFlatten
    const r = pushProducer({ log: producerLog })(data)

    await r(t0(t1(w)))

    expect(spy.calls).deep.eq([])
  })

  it('should deliver sub-producer error to consumer and continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t0 = pushMap((value: number) => {
      mapLog('mapping value')

      return pushProducer({ log: hoproducerLog, errorAtStep: 1 })([value, value])
    })
    const t1 = pushHoFlatten
    const r = pushProducer({ log: producerLog })(data)

    await r(t0(t1(w)))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver mapper error to consumer and continue', async () => {
    const data = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t0 = pushMap(emult2)
    const t1 = pushHoFlatten
    const r = pushProducer({ log: producerLog })(data)

    await r(t0(t1(w)))

    expect(spy.calls).deep.eq([
      [{ value: 1, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})

