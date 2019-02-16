import { describe, it } from 'mocha'
import { expect } from 'chai'
import debug from 'debug'
import fn from 'test-fn'
import { pullIterable } from '../src'
import makeNumbers from './make-numbers'
import pullConsumer from './pull-consumer'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')

describe('[ pullIterable ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pullConsumer({ log: consumerLog, delay: 10 })(spy)
    const r = pullIterable(data)

    await w(r)

    expect(spy.calls).deep.eq([
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
