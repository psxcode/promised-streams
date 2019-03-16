import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pushConsumer, pushProducer } from 'p-streams-test/src'
import { pushCombine } from '../src'
import makeNumbers from './make-numbers'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')
let logIndex = 0
const producerLog = () => debug(`ai:producer${logIndex++}`)

describe('[ pushCombine ]', () => {
  it('should work', async () => {
    const data0 = [0, 1, 2]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushCombine(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog() })(data1)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: [0, undefined], done: false }],
      [{ value: [0, 0], done: false }],
      [{ value: [1, 0], done: false }],
      [{ value: [1, 1], done: false }],
      [{ value: [2, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with only 0 producers', async () => {
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushCombine()

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer delay', async () => {
    const data0 = [0, 1, 2]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, delay: 30 })(spy)
    const r = pushCombine(
      pushProducer({ log: producerLog(), dataPrepareDelay: 5 })(data0),
      pushProducer({ log: producerLog(), dataPrepareDelay: 8 })(data1)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: [0, undefined], done: false }],
      [{ value: [0, 0], done: false }],
      [{ value: [1, 0], done: false }],
      [{ value: [1, 1], done: false }],
      [{ value: [2, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should propagate consumer cancel to all producers', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, cancelAtStep: 1 })(spy)
    const r = pushCombine(
      pushProducer({ log: producerLog(), dataPrepareDelay: 5 })(data0),
      pushProducer({ log: producerLog(), dataPrepareDelay: 8 })(data1)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: [0, undefined], done: false }],
      [{ value: [0, 0], done: false }],
    ])
  })

  it('should propagate consumer crash to all producers', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, crashAtStep: 1 })(spy)
    const r = pushCombine(
      pushProducer({ log: producerLog(), dataPrepareDelay: 5 })(data0),
      pushProducer({ log: producerLog(), dataPrepareDelay: 8 })(data1)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: [0, undefined], done: false }],
    ])
  })

  it('should propagate producer error to consumer', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog })(spy)
    const r = pushCombine(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog(), errorAtStep: 1 })(data1)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: [0, undefined], done: false }],
      [{ value: [0, 0], done: false }],
      [{ value: [1, 0], done: false }],
    ])
  })

  it('should propagate producer error to consumer and continue', async () => {
    const data0 = [0, 1, 2]
    const data1 = makeNumbers(3)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pushCombine(
      pushProducer({ log: producerLog() })(data0),
      pushProducer({ log: producerLog(), errorAtStep: 1 })(data1)
    )

    await r(w)

    expect(spy.calls).deep.eq([
      [{ value: [0, undefined], done: false }],
      [{ value: [0, 0], done: false }],
      [{ value: [1, 0], done: false }],
      [{ value: [2, 0], done: false }],
      [{ value: [2, 2], done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
