import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { debug } from './helpers/debug.ts'
import { fn } from './helpers/fn.ts'
import { pushConsumer } from '../../promised-streams-test/src/index.ts'
import { pushFromIterable } from '../src/index.ts'
import { makeNumbers } from './make-numbers.ts'

const consumerLog = debug('ai:consumer')
const sinkLog = debug('ai:sink')

describe('[ pushIterable ]', () => {
  it('should work', async () => {
    const data = makeNumbers(4)
    const spy = fn(sinkLog)
    const w = pushConsumer({ log: consumerLog, delay: 10 })(spy)
    const r = pushFromIterable(data)

    await r(w)

    assert.deepStrictEqual(spy.calls, [
      [{ value: 0, done: false }],
      [{ value: 1, done: false }],
      [{ value: 2, done: false }],
      [{ value: 3, done: false }],
      [{ value: undefined, done: true }],
    ])
  })
})
