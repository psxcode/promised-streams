import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pushConsumer, pushProducer } from 'async-iterama-test/src'
import { pushConcat } from '../src'
import makeNumbers from './make-numbers'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')
let logIndex = 0
const producerLog = () => debug(`ai:producer${logIndex++}`)

describe('[ pushConcat ]', () => {
  it('should work', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushConcat(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with single producer', async () => {
    const data0 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushConcat(
      pushProducer({ log: producerLog() })(data0)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with no producers', async () => {
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushConcat()

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer delay', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, delay: 30 })(spy)
    const r = pushConcat(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should propagate consumer cancel to all producers', async () => {
    const data0 = makeNumbers(4)
    const data1 = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 0 })(spy)
    const r = pushConcat(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
    ])
  })

  it('should propagate consumer crash to all producers', async () => {
    const data0 = makeNumbers(4)
    const data1 = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 0 })(spy)
    const r = pushConcat(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
    ])
  })

  it('should propagate producer error to consumer', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushConcat(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog(), errorAtStep: 0 })(data1)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
    ])
  })

  it('should propagate producer error to consumer and continue', async () => {
    const data0 = makeNumbers(2)
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pushConcat(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog(), errorAtStep: 0 })(data1)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 1, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
