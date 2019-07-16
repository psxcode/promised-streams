import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pushConsumer, pushProducer } from 'promised-streams-test/src'
import { pushWithLatest } from '../src'
import makeNumbers from './make-numbers'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')
let logIndex = 0
const producerLog = () => debug(`ai:producer${logIndex++}`)
const mainProducerLog = () => debug(`ai:main-producer`)

describe('[ pushWithLatest ]', () => {
  it('should work', async () => {
    const data0 = makeNumbers(4)
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushWithLatest(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1)
    )(
      pushProducer({ log: mainProducerLog(), dataPrepareDelay: 10 })(dataMain)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: [0, 3, 1], done: false }],
      [{ value: [1, 3, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with only main producer', async () => {
    const data0 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushWithLatest()(
      pushProducer({ log: mainProducerLog() })(data0)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: [0], done: false }],
      [{ value: [1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer delay', async () => {
    const data0 = makeNumbers(4)
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, delay: 30 })(spy)
    const r = pushWithLatest(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1)
    )(
      pushProducer({ log: mainProducerLog() })(dataMain)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: [0, 0, 0], done: false }],
      [{ value: [1, 3, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should propagate consumer cancel to all producers', async () => {
    const data0 = makeNumbers(4)
    const data1 = makeNumbers(4)
    const dataMain = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 0 })(spy)
    const r = pushWithLatest(
      pushProducer({ log: producerLog(), dataPrepareDelay: 10 })(data0),
      pushProducer({ log: producerLog(), dataPrepareDelay: 10 })(data1)
    )(
      pushProducer({ log: mainProducerLog(), dataPrepareDelay: 40 })(dataMain)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: [0, 2, 2], done: false }],
    ])
  })

  it('should propagate consumer cancel on complete to all producers', async () => {
    const data0 = makeNumbers(4)
    const data1 = makeNumbers(4)
    const dataMain = makeNumbers(1)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)
    const r = pushWithLatest(
      pushProducer({ log: producerLog(), dataPrepareDelay: 10 })(data0),
      pushProducer({ log: producerLog(), dataPrepareDelay: 10 })(data1)
    )(
      pushProducer({ log: mainProducerLog() })(dataMain)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: [0, undefined, undefined], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should propagate consumer crash to all producers', async () => {
    const data0 = makeNumbers(4)
    const data1 = makeNumbers(4)
    const dataMain = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const r = pushWithLatest(
      pushProducer({ log: producerLog(), dataPrepareDelay: 10 })(data0),
      pushProducer({ log: producerLog(), dataPrepareDelay: 10 })(data1)
    )(
      pushProducer({ log: mainProducerLog(), dataPrepareDelay: 40 })(dataMain)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: [0, 2, 2], done: false }],
    ])
  })

  it('should propagate consumer crash on complete to all producers', async () => {
    const data0 = makeNumbers(4)
    const data1 = makeNumbers(4)
    const dataMain = makeNumbers(1)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const r = pushWithLatest(
      pushProducer({ log: producerLog(), dataPrepareDelay: 10 })(data0),
      pushProducer({ log: producerLog(), dataPrepareDelay: 10 })(data1)
    )(
      pushProducer({ log: mainProducerLog() })(dataMain)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: [0, undefined, undefined], done: false }],
    ])
  })

  it('should propagate producer error to consumer', async () => {
    const data0 = makeNumbers(4)
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushWithLatest(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog(), errorAtStep: 1 })(data1)
    )(
      pushProducer({ log: mainProducerLog(), dataPrepareDelay: 10 })(dataMain)
    )

    await r(w)

    expect(spy.calls).deep.eq([])
  })

  it('should propagate main producer error to consumer', async () => {
    const data0 = makeNumbers(4)
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushWithLatest(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1)
    )(
      pushProducer({ log: mainProducerLog(), dataPrepareDelay: 10, errorAtStep: 0 })(dataMain)
    )

    await r(w)

    expect(spy.calls).deep.eq([])
  })

  it('should propagate producer error to consumer and continue', async () => {
    const data0 = makeNumbers(4)
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pushWithLatest(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog(), errorAtStep: 0 })(data1)
    )(
      pushProducer({ log: mainProducerLog() })(dataMain)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: [0, 3, undefined], done: false }],
      [{ value: [1, 3, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should propagate main producer error to consumer and continue', async () => {
    const data0 = makeNumbers(4)
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(3)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pushWithLatest(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1)
    )(
      pushProducer({ log: mainProducerLog(), errorAtStep: 1 })(dataMain)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: [0, 0, 0], done: false }],
      [{ value: [2, 3, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
