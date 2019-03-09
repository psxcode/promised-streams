import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pullConsumer, pushProducer } from 'async-iterama-test/src'
import { waitTimePromise as wait } from '@psxcode/wait'
import { pool } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')

describe('[ pool ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pushProducer({ log: producerLog })(data)
    const { pull, push } = pool<number>()

    await (r(push), w(pull))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle separate connection', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pushProducer({ log: producerLog })(data)
    const { pull, push } = pool<number>()

    /* first connect consumer */
    const consumer = w(pull)

    /* wait */
    await wait(50)

    /* connect producer */
    r(push)

    /* wait for consumer */
    await consumer

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle separate connection', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pushProducer({ log: producerLog })(data)
    const { pull, push } = pool<number>()

    /* first connect producer */
    r(push)

    /* wait */
    await wait(50)

    /* connect consumer and wait for consumer */
    await w(pull)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer delay', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, delay: 50 })(spy)
    const r = pushProducer({ log: producerLog })(data)
    const { pull, push } = pool<number>()

    await (r(push), w(pull))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer delay', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pushProducer({ log: producerLog, dataPrepareDelay: 50, dataResolveDelay: 50 })(data)
    const { pull, push } = pool<number>()

    await (r(push), w(pull))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pushProducer({ log: producerLog, errorAtStep: 2 })(data)
    const { pull, push } = pool<number>()

    try {
      await (r(push), w(pull))
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
        [{ value: 1, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })
})
