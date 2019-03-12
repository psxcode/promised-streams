import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { compose, pipe } from '@psxcode/compose'
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

describe('[ compose ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog })(spy)
    const t0 = pullMap(mult2)
    const t1 = pullMap(mult2)
    const r = pullProducer({ log: producerLog })(data)

    const pipedTranforms = pipe(t0, t1)
    const pipedProducer = pipe(t0, pipedTranforms)(r)
    const pipedConsumer = pipe(t0, pipedTranforms, w)
    const s0 = w(pipedProducer)
    const s1 = pipedConsumer(r)

    await

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 2, done: false }],
      [{ value: 4, done: false }],
      [{ value: 6, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
