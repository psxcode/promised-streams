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

    const piped0 = compose(w, t0, t1)(r)
    const piped1 = pipe(t0, t1, w)(r)
    const piped2 = pipe(t0, t1)
    const piped3 = pipe(t0, piped2)(r)
    const piped4 = pipe(t0, piped3)

    await w(piped)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 2, done: false }],
      [{ value: 4, done: false }],
      [{ value: 6, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
