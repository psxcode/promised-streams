import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { waitTimePromise as wait } from '@psxcode/wait'
import { pullConsumer, pullProducer } from 'async-iterama-test/src'
import { pullMap } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const mapLog = debug('ai:map')
const sinkLog = debug('ai:sink')
const mult2 = (value: number) => {
  mapLog('mapping value')

  return value * 2
}

const amult2 = async (value: number) => {
  mapLog('mapping value begin')
  await wait(50)
  mapLog('mapping value done')

  return value * 2
}

const emult2 = () => {
  throw new Error('error in mapper')
}


describe('[ pullMap ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullMap(mult2)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 2, done: false }],
      [{ value: 4, done: false }],
      [{ value: 6, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should work with async map', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullMap(amult2)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 2, done: false }],
      [{ value: 4, done: false }],
      [{ value: 6, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should deliver mapper error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullMap(emult2)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    try {
      await w(t(r))
    } catch {
      expect(spy.calls).deep.eq([])

      return
    }

    expect.fail('should not get here')
  })

  it('should deliver producer error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullMap(mult2)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    try {
      await w(t(r))
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
        [{ value: 2, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })

  it('should deliver producer error to consumer and continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pullMap(mult2)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 2, done: false }],
      [{ value: 6, done: false }],
      [{ value: undefined, done: true }],
    ])
  })

  it('should handle producer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullMap(mult2)
    const r = pullProducer({ log: producerLog, crashAtStep: 2 })(data)

    try {
      await w(t(r))
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
        [{ value: 2, done: false }],
      ])

      return
    }

    expect.fail('should not get here')
  })
})
