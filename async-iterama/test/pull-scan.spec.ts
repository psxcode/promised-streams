import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pullConsumer, pullProducer } from 'async-iterama-test/src'
import { pullScan } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')
const reducerLog = debug('ai:reducer')
const reducer = (state?: number, value?: number) => {
  reducerLog(`received state: ${state}, value: ${value}`)

  return (state == null ? 0 : state + value!)
}
const asyncReducer = async (state?: number, value?: number) => {
  reducerLog(`received state: ${state}, value: ${value}`)

  return state == null ? 0 : state + value!
}
const errReducer = (state?: number, value?: number) => {
  reducerLog('throwing error')
  void state
  void value
  throw new Error('reducer error')
}
const errReducer2 = (state?: number, value?: number) => {
  if (state == null) {
    return 0
  }
  reducerLog('throwing error')
  void state
  void value
  throw new Error('reducer error')
}


describe('[ pullScan ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullScan(reducer)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 3, done: false }],
      [{ value: 6, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with async reducer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullScan(asyncReducer)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 3, done: false }],
      [{ value: 6, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullScan(reducer)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    try {
      await w(t(r))
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
        [{ value: 1, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })

  it('should be able to continue on producer error', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pullScan(reducer)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 4, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver initial state error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullScan(errReducer)
    const r = pullProducer({ log: producerLog })(data)

    try {
      await w(t(r))
    } catch {
      expect(spy.calls).deep.eq([])

      return
    }

    expect.fail('should not get here')
  })

  it('should deliver reducer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullScan(errReducer2)
    const r = pullProducer({ log: producerLog })(data)

    try {
      await w(t(r))
    } catch {
      expect(spy.calls).deep.eq([])

      return
    }

    expect.fail('should not get here')
  })
})
