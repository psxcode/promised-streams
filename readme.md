# time-test

setTimeout, setInterval, setImmediate, requestAnimationFrame

## Install

```sh
npm install time-test
```

## `makeSetTimeout`

`(context: SetTimeoutContext) => (callback: () => any, delay: number) => number`

```ts
import {
  makeSetTimeout,
  makeSetTimeoutContext,
  tickTimeout,
  getSetTimeoutCalls,
} from 'time-test'

// create context
const context = makeSetTimeoutContext()

// create setTimeout
const setTimeout = makeSetTimeout(context)
const tick = tickTimeout(context)

// set a couple of callbacks
setTimeout(() => { console.log('cb0 invoked') }, 100)
setTimeout(() => { console.log('cb1 invoked') }, 200)
setTimeout(() => { console.log('cb2 invoked') }, 300)

// tick till NEXT callback in queue,
// this effectively forwards 100ms
// callback is fired synchronously
tick()  // -> cb0 invoked

// tick with provided timeStep
// lets pass another 250ms
tick(250) // -> cb1 invoked  -> cb2 invoked

// check the calls
expect(getSetTimeoutCalls(context)).deep.eq([
  { delay: 100 }, { delay: 200 }, { delay: 300 }
])
```

## `makeClearTimeout`

`(context: SetTimeoutContext) => (id: number) => void`

```ts
import {
  makeSetTimeoutContext,
  makeSetTimeout,
  makeClearTimeout,
  getSetTimeoutCalls,
  getClearTimeoutCalls,
} from 'time-test'

// create context
const context = makeSetTimeoutContext()

// create setTimeout
const setTimeout = makeSetTimeout(context)
// create clearTimeout
const clearTimeout = makeClearTimeout(context)

const id = setTimeout(() => {}, 100)

// clear by id
clearTimeout(id)

// check the state
expect(getSetTimeoutCalls(context)).deep.eq([
  { delay: 100 }
])

expect(getClearTimeoutCalls(context)).deep.eq([
  { id: 0 }
])
```

## `makeSetInterval`

`(context: SetIntervalContext) => (callback: () => any, delay: number) => number`

```ts
import {
  makeSetInterval,
  makeSetIntervalContext,
  tickInterval,
  getSetIntervalCalls,
} from 'time-test'

// create context
const context = makeSetIntervalContext()

// create setInterval
const setInterval = makeSetInterval(context)
const tick = tickInterval(context)

// set a couple of callbacks
setInterval(() => { console.log('cb0 invoked') }, 100)
setInterval(() => { console.log('cb1 invoked') }, 200)

// tick till NEXT callback in queue,
// this effectively forwards 100ms
// callback is fired synchronously
tick()  // -> cb0 invoked

// tick with provided timeStep
// lets pass another 250ms
tick(250) // -> cb0 invoked  -> cb1 invoked

// check the state
expect(getSetIntervalCalls(context)).deep.eq([
  { delay: 100 },
  { delay: 200 },
])
```

## `makeClearInterval`

`(context: SetIntervalContext) => (id: number) => void`

```ts
import {
  makeSetInterval,
  makeSetIntervalContext,
  getSetIntervalCalls,
  getClearIntervalCalls,
} from 'time-test'

// create context
const context = makeSetIntervalContext()

// create setInterval
const setInterval = makeSetInterval(context)
const clearInterval = makeClearInterval(context)

// set a callbacks
const id = setInterval(() => {}, 100)

// clear
clearInterval(id)

// check the state
expect(getSetIntervalCalls(context)).deep.eq([
  { delay: 100 },
])

expect(getClearIntervalCalls(context)).deep.eq([
  { id: 0 }
])
```

## `makeSetImmediate`

`(context: SetImmediateContext) => (callback: () => any) => number`

```ts
import {
  makeSetImmediate,
  makeSetImmediateContext,
  tickImmediate,
  getSetImmediateCalls,
} from 'time-test'

// create context
const context = makeSetImmediateContext()

// create setImmediate
const setInterval = makeSetImmediate(context)
const tick = tickImmediate(context)

// set a couple of callbacks
setImmediate(() => { console.log('cb0 invoked') })
setImmediate(() => { console.log('cb1 invoked') })

// tick ALL callbacks in queue,
// callbacks are fired synchronously
tick()  // -> cb0 invoked  -> cb1 invoked

// check the state
expect(getSetImmediateCalls(context)).deep.eq([
  {},
  {},
])
```

## `makeClearImmediate`

`(context: SetImmediateContext) => (id: number) => void`

```ts
import {
  makeSetImmediate,
  makeSetImmediateContext,
  getSetImmediateCalls,
  getClearImmediateCalls,
} from 'time-test'

// create context
const context = makeSetImmediateContext()

// create setImmediate
const setImmediate = makeSetImmediate(context)
const clearImmediate = makeClearImmediate(context)

// set a callbacks
const id = setImmediate(() => {}, 100)

// clear
clearImmediate(id)

// check the state
expect(getSetImmediateCalls(context)).deep.eq([
  {},
])

expect(getClearImmediateCalls(context)).deep.eq([
  { id: 0 }
])
```

## `makeRequestAnimationFrame`

`(context: RequestAnimationFrameContext) => (callback: () => any) => number`

```ts
import {
  makeRequestAnimationFrame,
  makeRequestAnimationFrameContext,
  tickAnimation,
  getRequestAnimationFrameCalls,
} from 'time-test'

// create context
const context = makeRequestAnimationFrameContext()

// create requestAnimationFrame
const requestAnimationFrame = makeRequestAnimationFrame(context)
const tick = tickAnimation(context)

// set a couple of callbacks
requestAnimationFrame(() => { console.log('cb0 invoked') })
requestAnimationFrame(() => { console.log('cb1 invoked') })

// tick ALL callbacks in queue,
// callbacks are fired synchronously
tick()  // -> cb0 invoked  -> cb1 invoked

// check the state
expect(getRequestAnimationFrameCalls(context)).deep.eq([
  {},
  {},
])
```

## `makeCancelAnimationFrame`

`(context: RequestAnimationFrameContext) => (callback: () => any) => number`

```ts
import {
  makeRequestAnimationFrame,
  makeCancelAnimationFrame,
  makeRequestAnimationFrameContext,
  getRequestAnimationFrameCalls,
  getCancelAnimationFrameCalls,
} from 'time-test'

// create context
const context = makeRequestAnimationFrameContext()

// create requestAnimationFrame
const requestAnimationFrame = makeRequestAnimationFrame(context)
const cancelAnimationFrame = makeCancelAnimationFrame(context)

// set a couple of callbacks
const id = requestAnimationFrame(() => { console.log('cb0 invoked') })

cancelAnimationFrame(id)

// check the state
expect(getRequestAnimationFrameCalls(context)).deep.eq([
  {},
])

expect(getCancelAnimationFrameCalls(context)).deep.eq([
  { id: 0 },
])
```
