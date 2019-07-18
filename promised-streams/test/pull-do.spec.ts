import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { waitTimePromise as wait } from '@psxcode/wait'
import { pullConsumer, pullProducer } from 'promised-streams-test/src'
import { pullDo } from '../src'
import makeNumbers from './make-numbers'

const producerLog = debug('ai:producer')
const consumerLog = debug('ai:consumer')
const doLog = debug('ai:do')
const sinkLog = debug('ai:sink')
const doFunc = (value: number) => {
  doLog(`got the value ${value}`)
}

const asyncDoFunc = async (value: number) => {
  doLog(`getting value begin ${value}`)
  await wait(50)
  doLog('getting value done')
}

const errorDoFunc = () => {
  throw new Error('error')
}


describe('[ pullDo ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const doSpy = fn(doFunc)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullDo(doSpy)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])

    expect(doSpy.calls).deep.eq([
      [0],
      [1],
      [2],
      [3],
    ])
  })

  it('should work with async dofunc', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const doSpy = fn(asyncDoFunc)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullDo(doSpy)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])

    expect(doSpy.calls).deep.eq([
      [0],
      [1],
      [2],
      [3],
    ])
  })

  it('should not deliver dofunc error to consumer', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullDo(errorDoFunc)
    const r = pullProducer({ log: producerLog })(data)

    await w(t(r))

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
    const doSpy = fn(doFunc)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullDo(doSpy)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    try {
      await w(t(r))

      expect.fail('should not get here')
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
        [{ value: 1, done: false }],
      ])

      expect(doSpy.calls).deep.eq([
        [0],
        [1],
      ])
    }
  })

  it('should deliver producer error to consumer and continue', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const doSpy = fn(doFunc)
    const w = pullConsumer({ log: consumerLog, continueOnError: true })(spy)
    const t = pullDo(doSpy)
    const r = pullProducer({ log: producerLog, errorAtStep: 2 })(data)

    await w(t(r))

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])

    expect(doSpy.calls).deep.eq([
      [0],
      [1],
      [3],
    ])
  })

  it('should handle producer crash', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const doSpy = fn(doFunc)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t = pullDo(doSpy)
    const r = pullProducer({ log: producerLog, crashAtStep: 2 })(data)

    try {
      await w(t(r))

      expect.fail('should not get here')
    } catch {
      expect(spy.calls).deep.eq([
        [{ value: 0, done: false }],
        [{ value: 1, done: false }],
      ])

      expect(doSpy.calls).deep.eq([
        [0],
        [1],
      ])
    }
  })
})
