import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pullConsumer, pullProducer } from 'async-iterama-test/src'
import { waitTimePromise as wait } from '@psxcode/wait'
import { pullWithLatest } from '../src'
import makeNumbers from './make-numbers'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')
let logIndex = 0
const producerLog = () => debug(`ai:producer${logIndex++}`)
const mainProducerLog = () => debug(`ai:main-producer`)

describe('[ pullWithLatest ]', () => {
  it('should work', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullWithLatest(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog() })(data1)
    )(
      pullProducer({ log: mainProducerLog(), dataPrepareDelay: 10 })(dataMain)
    )

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: [0, 3, 1], done: false }],
      [{ value: [1, 3, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with only main producer', async () => {
    const data0 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullWithLatest()(
      pullProducer({ log: mainProducerLog() })(data0)
    )

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: [0], done: false }],
      [{ value: [1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer delay', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, delay: 50 })(spy)
    const r = pullWithLatest(
      pullProducer({ log: producerLog(), dataPrepareDelay: 7 })(data0),
      pullProducer({ log: producerLog(), dataPrepareDelay: 7 })(data1)
    )(
      pullProducer({ log: mainProducerLog(), dataPrepareDelay: 10 })(dataMain)
    )

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: [0, 0, 0], done: false }],
      [{ value: [1, 3, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should propagate producer error to consumer', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullWithLatest(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog(), errorAtStep: 0 })(data1)
    )(
      pullProducer({ log: mainProducerLog(), dataPrepareDelay: 10 })(dataMain)
    )

    try {
      await w(r)
    } catch {
      /* drain producers */
      await wait(50)

      expect(spy.calls).deep.eq([
        [{ value: [0, 3, undefined], done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })

  it('should propagate main producer error to consumer', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullWithLatest(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog() })(data1)
    )(
      pullProducer({ log: mainProducerLog(), errorAtStep: 0, dataPrepareDelay: 10 })(dataMain)
    )

    try {
      await w(r)
    } catch {
      /* drain producers */
      await wait(50)

      expect(spy.calls).deep.eq([
      ])

      return
    }

    expect.fail('should not get here')
  })

  it('should propagate producer error to consumer and continue', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pullWithLatest(
      pullProducer({ log: producerLog(), dataPrepareDelay: 4 })(data0),
      pullProducer({ log: producerLog(), dataPrepareDelay: 7, errorAtStep: 0 })(data1)
    )(
      pullProducer({ log: mainProducerLog(), dataPrepareDelay: 10 })(dataMain)
    )

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: [0, 1, undefined], done: false }],
      [{ value: [1, 3, undefined], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullWithLatest(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog(), crashAtStep: 0 })(data1)
    )(
      pullProducer({ log: mainProducerLog(), dataPrepareDelay: 10 })(dataMain)
    )

    try {
      await w(r)
    } catch {
      /* drain producers */
      await wait(50)

      expect(spy.calls).deep.eq([
        [{ value: [0, 3, undefined], done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })

  it('should handle main producer crash', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const dataMain = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullWithLatest(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog() })(data1)
    )(
      pullProducer({ log: mainProducerLog(), crashAtStep: 0, dataPrepareDelay: 10 })(dataMain)
    )

    try {
      await w(r)
    } catch {
      /* drain producers */
      await wait(50)

      expect(spy.calls).deep.eq([
      ])

      return
    }

    expect.fail('should not get here')
  })
})
