import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pushConsumer, pushProducer } from 'promised-streams-test/src'
import { pushReduce } from '../src'
import { makeNumbers } from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')
const reducerLog = debug('ai:reducer')
const reducer = (state?: number, value?: number) => {
  reducerLog(`received state: ${state}, value: ${value}`)

  return (state == null ? 0 : state + value!)
}
const areducer = async (state?: number, value?: number) => {
  reducerLog(`received state: ${state}, value: ${value}`)

  return state == null ? 0 : state + value!
}
const ereducer = (state?: number, value?: number) => {
  reducerLog('throwing error')
  void state
  void value
  throw new Error('reducer error')
}
const ereducer2 = (state?: number, value?: number) => {
  if (state == null) {
    return 0
  }
  reducerLog('throwing error')
  void state
  void value
  throw new Error('reducer error')
}


describe('[ pushReduce ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushReduce(reducer)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 6, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with async map', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushReduce(areducer)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 6, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver consumer cancel', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 0 })(spy)
    const t = pushReduce(reducer)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 6, done: false }],
    ])
  })

  it('should deliver consumer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const t = pushReduce(reducer)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([
      [{ value: 6, done: false }],
    ])
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushReduce(reducer)
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([])
  })

  it('should deliver reducer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushReduce(ereducer)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([])
  })

  it('should deliver reducer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const t = pushReduce(ereducer2)
    const r = pushProducer({ log: producerLog })(data)

    await r(t(w))

    expect(spy.calls).deep.eq([])
  })
})
