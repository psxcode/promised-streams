import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pullConsumer, pullProducer } from 'p-streams-test/src'
import { waitTimePromise as wait } from '@psxcode/wait'
import { pullCombine } from '../src'
import makeNumbers from './make-numbers'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')
let logIndex = 0
const producerLog = () => debug(`ai:producer${logIndex++}`)

describe('[ pullCombine ]', () => {
  it('should work', async () => {
    const data0 = [0, 1, 2]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullCombine(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog() })(data1)
    )

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: [0, undefined], done: false }],
      [{ value: [0, 0], done: false }],
      [{ value: [1, 0], done: false }],
      [{ value: [1, 1], done: false }],
      [{ value: [2, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with no producers', async () => {
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullCombine()

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle consumer delay', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, delay: 50 })(spy)
    const r = pullCombine(
      pullProducer({ log: producerLog(), dataPrepareDelay: 4 })(data0),
      pullProducer({ log: producerLog(), dataPrepareDelay: 7 })(data1)
    )

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: [0, undefined], done: false }],
      [{ value: [0, 0], done: false }],
      [{ value: [1, 0], done: false }],
      [{ value: [1, 1], done: false }],
      [{ value: [2, 1], done: false }],
      [{ value: [3, 1], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should propagate producer error to consumer', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullCombine(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog(), errorAtStep: 1 })(data1)
    )

    try {
      await w(r)

      expect.fail('should not get here')
    } catch {
      /* drain producers */
      await wait(50)

      expect(spy.calls).deep.eq([
        [{ value: [0, undefined], done: false }],
        [{ value: [0, 0], done: false }],
        [{ value: [1, 0], done: false }],
      ])
    }
  })

  it('should propagate producer error to consumer and continue', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const r = pullCombine(
      pullProducer({ log: producerLog(), dataPrepareDelay: 4 })(data0),
      pullProducer({ log: producerLog(), dataPrepareDelay: 7, errorAtStep: 1 })(data1)
    )

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: [0, undefined], done: false }],
      [{ value: [0, 0], done: false }],
      [{ value: [1, 0], done: false }],
      [{ value: [2, 0], done: false }],
      [{ value: [3, 0], done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data0 = [0, 1, 2, 3]
    const data1 = makeNumbers(2)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const r = pullCombine(
      pullProducer({ log: producerLog() })(data0),
      pullProducer({ log: producerLog(), crashAtStep: 1 })(data1)
    )

    try {
      await w(r)

      expect.fail('should not get here')
    } catch {
      /* drain producers */
      await wait(50)

      expect(spy.calls).deep.eq([
        [{ value: [0, undefined], done: false }],
        [{ value: [0, 0], done: false }],
      ])
    }
  })
})
