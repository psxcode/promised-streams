# Promised Streams

Promise-based Streams with `pressure` control, `Error` delivery and lots of `RxJS`-like operators.

[![npm version](https://img.shields.io/npm/v/promised-streams.svg)](https://www.npmjs.com/package/promised-streams)
[![Node.js](https://img.shields.io/node/v/promised-streams.svg)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/promised-streams.svg)](LICENSE)
[![codecov](https://codecov.io/gh/psxcode/promised-streams/branch/master/graph/badge.svg)](https://codecov.io/gh/psxcode/promised-streams)- [Promised Streams](#promised-streams)
  - [Why](#why)
  - [Install](#install)
  - [Composition](#composition)
  - [`Pull` streams](#pull-streams)
  - [`Push` streams](#push-streams)
  - [End-to-end example](#end-to-end-example)
  - [Operator index](#operator-index)
  - [Terminology](#terminology)
  - [Iterator Protocol](#iterator-protocol)
  - [Async Iterator Protocol](#async-iterator-protocol)
  - [Publish / Subscribe Protocol](#publish-subscribe-protocol)
  - [Interfaces](#interfaces)
  - [Creation](#creation)
    - [`pullFromIterable`](#pullfromiterable)
    - [`pushFromIterable`](#pushfromiterable)
    - [`pullFromStream`](#pullfromstream)
    - [`pushFromStream`](#pushfromstream)
  - [Conversion](#conversion)
    - [`pool`](#pool)
    - [`pump`](#pump)
  - [Combination](#combination)
    - [`pullConcat`](#pullconcat)
    - [`pushConcat`](#pushconcat)
    - [`pullCombine`](#pullcombine)
    - [`pushCombine`](#pushcombine)
    - [`pullMerge`](#pullmerge)
    - [`pushMerge`](#pushmerge)
    - [`pullStartWith`](#pullstartwith)
    - [`pushStartWith`](#pushstartwith)
    - [`pullWithLatest`](#pullwithlatest)
    - [`pushWithLatest`](#pushwithlatest)
    - [`pullZip`](#pullzip)
    - [`pushZip`](#pushzip)
  - [Filtering](#filtering)
    - [`pullFilter`](#pullfilter)
    - [`pushFilter`](#pushfilter)
    - [`pullDistinct`](#pulldistinct)
    - [`pushDistinct`](#pushdistinct)
    - [`pullDistinctUntilChanged`](#pulldistinctuntilchanged)
    - [`pushDistinctUntilChanged`](#pushdistinctuntilchanged)
    - [`pullUnique`](#pullunique)
    - [`pushUnique`](#pushunique)
    - [`pushDebounce`](#pushdebounce)
    - [`pushDebounceTime`](#pushdebouncetime)
    - [`pushThrottle`](#pushthrottle)
    - [`pushThrottleTime`](#pushthrottletime)
    - [`pullSkip`](#pullskip)
    - [`pushSkip`](#pushskip)
    - [`pullTake`](#pulltake)
    - [`pushTake`](#pushtake)
  - [Transformation](#transformation)
    - [`pullMap`](#pullmap)
    - [`pushMap`](#pushmap)
    - [`pullReduce`](#pullreduce)
    - [`pushReduce`](#pushreduce)
    - [`pullScan`](#pullscan)
    - [`pushScan`](#pushscan)
    - [`pullHoFlatten`](#pullhoflatten)
    - [`pushHoFlatten`](#pushhoflatten)
    - [`pullFlatMap`](#pullflatmap)
    - [`pushFlatMap`](#pushflatmap)
  - [Side Effects](#side-effects)
    - [`pullDo`](#pulldo)
    - [`pushDo`](#pushdo)
    - [`pullSide`](#pullside)
    - [`pushSide`](#pushside)
  - [Testing your streams](#testing-your-streams)
  - [License](#license)

## Why

- **Backpressure built in** — a `push` producer waits for the consumer's promise before sending the next chunk, a `pull` producer only produces when asked. A slow consumer slows the producer down instead of flooding memory.
- **Errors travel through the stream** — an error is a rejected `Promise` delivered over the same channel as data. No separate error callback to wire up.
- **Two directions, one API** — every operator comes as `pullX` and `pushX` with the same name and semantics. Pick the direction your data flows.
- **Tiny and dependency-free** — zero dependencies, ESM, tree-shakeable, TypeScript declarations included.
- **Plain functions only** — no classes, no framework. Every operator is a function you can compose with any helper you like.

## Install

```sh
npm install promised-streams
```

- Node.js **24+**
- **ESM only** (`"type": "module"`)
- Ships its own type declarations — no `@types/*` packages needed
- Zero dependencies

## Composition

Operators are curried — `pullFilter(predicate)` returns a function that takes a producer and returns a producer — so they compose with any function-composition helper. The examples in this readme use these two:

```js
const pipe =
  (...fns) =>
  (arg) =>
    fns.reduce((arg, fn) => fn(arg), arg)

const compose =
  (...fns) =>
  (arg) =>
    fns.reduceRight((arg, fn) => fn(arg), arg)
```

- `pipe(f, g)(source)` — data flows through `f`, then `g`. Transforms in reading order, source last. Used in `Pull` examples.
- `compose(source, f, g)(consumer)` — data flows from `source`, through `f`, then `g`. Source first, transforms in data-flow order. Used in `Push` examples.

> `pipe` and `compose` are not part of the package — add the snippet above to your project.

## `Pull` streams

```js
import { pullFromIterable, pullFilter, pullMap } from 'promised-streams'

const data = [0, 1, 2, 3, 4]

const pipedTransforms = pipe(
  pullFilter(x => x % 2 === 0),
  pullMap(x => x * 2)
)

const pullProducer = pipedTransforms(
  pullFromIterable(data)
)

/* consume PullProducer */
while (true) {
  /* unwrap the value */
  const { value, done } = await pullProducer()

  /* check if done */
  if (done) {
    break
  }

  /* consume the value */
  console.log(value)

  /* 0, 4, 8 */
}
```

## `Push` streams

```js
import { pushFromIterable, pushFilter, pushMap } from 'promised-streams'

const data = [0, 1, 2, 3, 4]

const composedProducer = compose(
  pushFromIterable(data),
  pushFilter(x => x % 2 === 0),
  pushMap(x => x * 2)
)

/* subscribe to PushProducer */
await composedProducer(async (result) => {
  /* unwrap the value */
  const { value, done } = await result

  /* check if done */
  if (done) {
    return
  }

  /* consume the value */
  console.log(value)

  /* 0, 4, 8 */
})
```

## End-to-end example

Reading a file as a stream of chunks, filtering out empty ones, transforming the rest and taking a fixed number — with backpressure flowing all the way back to the file descriptor:

```js
import { createReadStream } from 'node:fs'
import { pullFromStream, pullFilter, pullMap, pullTake } from 'promised-streams'

const producer = pipe(
  pullFilter((chunk) => chunk.length > 0),
  pullMap((chunk) => chunk.toString('utf8').trim()),
  pullTake(3)
)(
  pullFromStream(createReadStream('./data.txt'))
)

try {
  while (true) {
    const { value, done } = await producer()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  console.error(e)
}
```

## Operator index

Every operator exists in two flavors: `pullX` for `Pull` streams and `pushX` for `Push` streams.

**Creation**

| Operator | Pull | Push |
| :-- | :-- | :-- |
| Stream values from an iterable | [`pullFromIterable`](#pullfromiterable) | [`pushFromIterable`](#pushfromiterable) |
| Stream values from a Node.js readable | [`pullFromStream`](#pullfromstream) | [`pushFromStream`](#pushfromstream) |

**Conversion**

- [`pool`](#pool) — converts a `Push` producer into a `Pull` producer, buffering values up to `highWatermark`
- [`pump`](#pump) — converts a `Pull` producer into a `Push` producer

**Combination**

| Operator | Pull | Push |
| :-- | :-- | :-- |
| Deliver producers one after another | [`pullConcat`](#pullconcat) | [`pushConcat`](#pushconcat) |
| Emit the latest value of each producer on every change | [`pullCombine`](#pullcombine) | [`pushCombine`](#pushcombine) |
| Emit values from all producers as they arrive | [`pullMerge`](#pullmerge) | [`pushMerge`](#pushmerge) |
| Emit the given values first | [`pullStartWith`](#pullstartwith) | [`pushStartWith`](#pushstartwith) |
| Emit each main value paired with the latest of the others | [`pullWithLatest`](#pullwithlatest) | [`pushWithLatest`](#pushwithlatest) |
| Emit values from all producers in lockstep | [`pullZip`](#pullzip) | [`pushZip`](#pushzip) |

**Filtering**

| Operator | Pull | Push |
| :-- | :-- | :-- |
| Keep chunks matching a predicate | [`pullFilter`](#pullfilter) | [`pushFilter`](#pushfilter) |
| Filter by a custom `isAllowed(prev, next)` check | [`pullDistinct`](#pulldistinct) | [`pushDistinct`](#pushdistinct) |
| Drop consecutive duplicates | [`pullDistinctUntilChanged`](#pulldistinctuntilchanged) | [`pushDistinctUntilChanged`](#pushdistinctuntilchanged) |
| Drop values already seen earlier in the stream | [`pullUnique`](#pullunique) | [`pushUnique`](#pushunique) |
| Skip the first / last N chunks | [`pullSkip`](#pullskip) | [`pushSkip`](#pushskip) |
| Take the first / last N chunks | [`pullTake`](#pulltake) | [`pushTake`](#pushtake) |
| Debounce by a custom wait function | — | [`pushDebounce`](#pushdebounce) |
| Debounce by a time interval | — | [`pushDebounceTime`](#pushdebouncetime) |
| Throttle by a custom wait function | — | [`pushThrottle`](#pushthrottle) |
| Throttle by a time interval | — | [`pushThrottleTime`](#pushthrottletime) |

**Transformation**

| Operator | Pull | Push |
| :-- | :-- | :-- |
| Transform each chunk | [`pullMap`](#pullmap) | [`pushMap`](#pushmap) |
| Reduce the stream to a single final value | [`pullReduce`](#pullreduce) | [`pushReduce`](#pushreduce) |
| Emit the running reduction state on every chunk | [`pullScan`](#pullscan) | [`pushScan`](#pushscan) |
| Flatten a stream of producers | [`pullHoFlatten`](#pullhoflatten) | [`pushHoFlatten`](#pushhoflatten) |
| Map each chunk to a producer, then flatten | [`pullFlatMap`](#pullflatmap) | [`pushFlatMap`](#pushflatmap) |

**Side effects**

| Operator | Pull | Push |
| :-- | :-- | :-- |
| Run a side effect, ignore its errors | [`pullDo`](#pulldo) | [`pushDo`](#pushdo) |
| Run a side effect, propagate its errors into the stream | [`pullSide`](#pullside) | [`pushSide`](#pushside) |


## Terminology

`Push` type streams, where values are eagerly pushed by `producer` to `consumer`, as soon as available.  
`Pull` type streams, where values are lazily pulled by `consumer` from `producer`, as soon as needed.  
`Pressure` is a special data channel, carrying information about data saturation in the stream.

`PushProducer` is an active, `push` type producer, which pushes values to consumer, as soon as they are available.  
`PushConsumer` is a passive, `push` type consumer, which waits for values to arrive from producer.  
`Pressure` information in such streams is delivered from `consumer` to `producer` — high pressure, while data consumption is in progress.

`PullConsumer` is an active, `pull` type consumer, which pulls values from producer as needed.  
`PullProducer` is a passive, `pull` type producer, which provides values to be pulled from.  
`Pressure` information is delivered from `producer` to `consumer` — low pressure, while data production is in progress.

`Pool` converts a `Push` type stream to a `Pull` type stream, buffering pushed values until they are pulled.  
`Pump` converts a `Pull` type stream to a `Push` type stream, pulling values eagerly and pushing them to the consumer.

## Iterator Protocol
Standard JavaScript iterator protocol carries data and end of the iteration indicator  
```js
const iterator = getIterator(data)

const chunk = iterator.next() // { value: 42, done: false }
```
`{ value: 42, done: false }` is a valid data chunk  
```js
const chunk = iterator.next() // { value: undefined, done: true }
```
`{ value: undefined, done: true }` is an iteration end chunk

This protocol implements lazy `Pull` type stream of values, with several limitations
- No `Error` information channel
- Synchronous delivery, so data must be available at the moment of request

## Async Iterator Protocol
Adding JavaScript Promises to the Iterator Protocol allows carrying additional information
```js
const iterator = getIterator(data)

const chunkPromise = iterator.next() // Promise<{ value, done }>

const chunk = await chunkPromise
```
Features of Asynchronous Iterator Protocol
- Lazy data requests, by calling `next` when needed.
- Async data delivery in chunks, by `await chunkPromise`.
- Async `Error` delivery by rejected `Promise`s.
- End of stream indication by `{ value: undefined, done: true }`.

## Publish / Subscribe Protocol
This protocol implements eager `Push` type streams of values
```js
producer.subscribe((chunk) => {
  consumeChunk(chunk)
})
```
- No `Error` delivery
- No end of stream indication
- No pressure control, data must be consumed synchronously

With adoption of Node's `error first` callback style, we can add `Error` delivery to this protocol
```js
producer.subscribe((error, chunk) => {
  if (error) {
    return reportError(error)
  }
  consumeChunk(chunk)
})
```
But still no `end of stream` indication and no `pressure` control. 

By adding Iterator Protocol chunk objects, we can add `end of stream` indication.
```js
producer.subscribe((error, { value, done }) => {
  if (error) {
    return reportError(error)
  }
  if (done) {
    return reportDone()
  }
  consumeChunk(value)
})
```
But still no `pressure` control.  

By introducing Async Iterator Protocol chunk objects, we can encapsulate `Error` in promise itself.
```js
producer.subscribe(async (chunkPromise) => {
  let chunk

  try {
    chunk = await chunkPromise
  } catch (e) {
    return reportError(e)
  }

  if (chunk.done) {
    return reportDone()
  }

  consumeChunk(chunk.value)
})
```
Now it's easy to add support for `pressure` control.  
`Producer` must first resolve the `Promise` returned by the `Subscriber` function, and only after that send the next value. We could also add the `await` operator to the `consumeChunk` function call...
```js
await consumeChunk(chunk.value)
```
Thus making the `producer` wait for the chunk to be actually processed before sending the next one.

## Interfaces

`type PushConsumer <T> = (value: Promise<IteratorResult<T>>) => Promise<void>`  
`PushConsumer` is just a function which accepts a value and returns a `Promise` to have time to consume the chunk. This promise can be `rejected` to indicate an error during data processing, or to unsubscribe. The producer will immediately stop data delivery to an unsubscribed consumer.

`type PushProducer <T> = (consumer: PushConsumer<T>) => Promise<void>`  
`PushProducer` is a function accepting `PushConsumer`. After getting a consumer, producer begins sending data to consumer. `PushProducer` returns a `Promise`, which resolves after all data was pushed to consumer. This promise will never be rejected. All errors during data production will be forwarded to consumer.

`type PullProducer <T> = () => Promise<IteratorResult<T>>`  
`PullProducer` is a function which returns a chunk of data, delivered as a `Promise` of `IteratorResult`. The promise can be rejected by the producer to indicate an `Error`.  

`type PullConsumer <T> = (producer: PullProducer<T>) => Promise<void>`  
`PullConsumer` is a function accepting `PullProducer`. After getting the producer, consumer begins pulling the data. `PullConsumer` returns a `Promise`, which will be resolved after all data was pulled, or will be rejected if the producer delivered an `Error`.

## Creation

### `pullFromIterable`
Creates `Pull` type producer, which will stream data from standard Iterable.  
> `<T> (iterable: Iterable<T>) => PullProducer<T>`
```js
import { pullFromIterable } from 'promised-streams'

const data = [0, 1, 2, 3]
/* create PullProducer */
const producer = pullFromIterable(data)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await producer()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  console.error(e)
}
```

### `pushFromIterable`
Creates `Push` type producer, which will stream data from standard Iterable.  
> `<T> (iterable: Iterable<T>) => PushProducer<T>`
```js
import { pushFromIterable } from 'promised-streams'

const data = [0, 1, 2, 3]
const pushProducer = pushFromIterable(data)

/* subscribe to PushProducer */
await pushProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullFromStream`
Creates `Pull` type producer, which will deliver data from a Node.js `Readable` stream. The `stream` parameter is structurally typed — anything with `on`, `once`, `removeListener` and `read` methods works, so `@types/node` is not required.  
> `<T> (stream: ReadableStream) => PullProducer<T>`
```js
import { createReadStream } from 'node:fs'
import { pullFromStream } from 'promised-streams'

const readable = createReadStream('./data.txt')
const producer = pullFromStream(readable)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await producer()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  console.error(e)
}
```

### `pushFromStream`
Creates `Push` type producer, which will deliver data from a Node.js `Readable` stream. The `stream` parameter is structurally typed — anything with `on`, `once`, `removeListener` and `read` methods works, so `@types/node` is not required.  
> `<T> (stream: ReadableStream) => PushProducer<T>`
```js
import { createReadStream } from 'node:fs'
import { pushFromStream } from 'promised-streams'

const readable = createReadStream('./data.txt')
const pushProducer = pushFromStream(readable)

/* subscribe to PushProducer */
await pushProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## Conversion

### `pool`
Converts `Push` type producer to `Pull` type producer. Values pushed into the pool are buffered and served to the `pull` side; with a positive `highWatermark`, pushing pauses once the buffer is full until the consumer catches up.  
> `<T> (options?: IPoolOptions) => IPool<T>`

> `type IPool <T> = { push: PushConsumer<T>, pull: PullProducer<T> }`
```js
import { pool, pushFromIterable } from 'promised-streams'

const data = [0, 1, 2, 3]
const producer = pushFromIterable(data)

/* create Pool, returning PullProducer and PushConsumer */
const { pull, push } = pool({ highWatermark: 32 })

/* begin pushing to Pool's PushConsumer */
producer(push)

try {
  /* consume Pool's PullProducer */
  while (true) {
    const { value, done } = await pull()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  console.error(e)
}
```

### `pump`
Converts `Pull` type producer to `Push` type producer.  
> `<T> (producer: PullProducer<T>) => PushProducer<T>`
```js
import { pump, pullFromIterable } from 'promised-streams'

/* create PullProducer */
const data = [0, 1, 2, 3]
const pullProducer = pullFromIterable(data)

/* create PushProducer from PullProducer */
const pushProducer = pump(pullProducer)

/* subscribe to PushProducer */
await pushProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## Combination

### `pullConcat`
Creates concatenated `Pull` producer, which will deliver data from provided producers sequentially. Once first producer is `done`, stream will switch to the next one. `done` chunk will be delivered once, when all producers are complete.
> `<T> (...producers: PullProducer<T>[]) => PullProducer<T>`
```js
import { pullConcat, pullFromIterable } from 'promised-streams'

const pp0 = pullFromIterable([0, 1, 2])
const pp1 = pullFromIterable([3, 4, 5])
const pp2 = pullFromIterable([6, 7, 8])

/* create concatenated PullProducer */
const concatenatedProducer = pullConcat(pp0, pp1, pp2)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await concatenatedProducer()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  console.error(e)
}
```

### `pushConcat`
Concatenates all `Push` producers, creating single `Push` producer, which delivers the data from each, excluding `done`. End of stream is delivered once, at the end.
> `<T> (...producers: PushProducer<T>[]) => PushProducer<T>`
```js
import { pushConcat, pushFromIterable } from 'promised-streams'

const pp0 = pushFromIterable([0, 1, 2])
const pp1 = pushFromIterable([3, 4, 5])
const pp2 = pushFromIterable([6, 7, 8])

/* create concatenated PushProducer */
const concatenatedProducer = pushConcat(pp0, pp1, pp2)

/* subscribe to PushProducer */
await concatenatedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullCombine`
Creates combined `Pull` producer. Each latest chunk from provided producers is combined with others into an array, which is updated and delivered each time any of producers has new value. If one of producers ends, its latest value is remembered, and is delivered with values from other producers. Once all producers are `done`, the stream completes.
> `<...> (...producers: PullProducer<...>[]) => PullProducer<[...]>`
```js
import { pullCombine, pullFromIterable } from 'promised-streams'

const pp0 = pullFromIterable([0, 1])
const pp1 = pullFromIterable([2, 3])
const pp2 = pullFromIterable([4, 5])

/* create PullProducer */
const combinedProducer = pullCombine(pp0, pp1, pp2)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await combinedProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // [0, undefined, undefined]
    // [0, 2, undefined]
    // [0, 2, 4]
    // [1, 2, 4]
    // [1, 3, 4]
    // [1, 3, 5]
  }
} catch (e) {
  console.error(e)
}
```

### `pushCombine`
Creates combined `Push` producer. Each latest chunk from provided producers is combined with others into an array, which is updated and delivered each time any of producers has new value. If one of producers ends, its latest value is remembered, and is delivered with values from other producers. Once all producers are `done`, the stream completes.
> `<...> (...producers: PushProducer<...>[]) => PushProducer<[...]>`
```js
import { pushCombine, pushFromIterable } from 'promised-streams'

const pp0 = pushFromIterable([0, 1])
const pp1 = pushFromIterable([2, 3])
const pp2 = pushFromIterable([4, 5])

/* create combined PushProducer */
const combinedProducer = pushCombine(pp0, pp1, pp2)

/* subscribe to PushProducer */
await combinedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // [0, undefined, undefined]
    // [0, 2, undefined]
    // [0, 2, 4]
    // [1, 2, 4]
    // [1, 3, 4]
    // [1, 3, 5]
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullMerge`
Creates `Pull` producer, which delivers values from provided producers as soon as available, so the values from all producers are mixed with each other in the resulting stream. Stream ends when all producers are complete.
> `<...> (...producers: PullProducer<...>[]) => PullProducer<...>`
```js
import { pullMerge, pullFromIterable } from 'promised-streams'

const pp0 = pullFromIterable([0, 1])
const pp1 = pullFromIterable([2, 3])
const pp2 = pullFromIterable([4, 5])

/* create merged PullProducer */
const mergedProducer = pullMerge(pp0, pp1, pp2)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await mergedProducer()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  console.error(e)
}
```

### `pushMerge`
Creates `Push` producer, which delivers values from provided producers as soon as available, so the values from all producers are mixed with each other in the resulting stream. Stream ends when all producers are complete.
> `<...> (...producers: PushProducer<...>[]) => PushProducer<...>`
```js
import { pushMerge, pushFromIterable } from 'promised-streams'

const pp0 = pushFromIterable([0, 1])
const pp1 = pushFromIterable([2, 3])
const pp2 = pushFromIterable([4, 5])

/* create merged PushProducer */
const mergedProducer = pushMerge(pp0, pp1, pp2)

/* subscribe to PushProducer */
await mergedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullStartWith`
Creates `Pull` producer, which will stream values starting with provided ones.
> `<T> (...values: T[]) => (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullStartWith, pullFromIterable } from 'promised-streams'

const producer = pullFromIterable([2, 3])
/* create PullProducer */
const startWithProducer = pullStartWith(0, 1)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await startWithProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
    // 2
    // 3
  }
} catch (e) {
  console.error(e)
}
```

### `pushStartWith`
Creates `Push` producer, which will stream values starting with provided ones.
> `<T> (...values: T[]) => (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushStartWith, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([2, 3])

/* startWith is a PushConsumer transform, so compose it with the producer */
const startWithProducer = compose(
  producer,
  pushStartWith(0, 1)
)

/* subscribe to PushProducer */
await startWithProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
    // 2
    // 3
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullWithLatest`
Creates `Pull` producer, which streams values from `mainProducer`, combined with latest values from provided producers. Only `mainProducer` can initiate chunk delivery. Stream ends when `mainProducer` completes.
> `<...> (...producers: PullProducer<...>[]) => <T>(mainProducer: PullProducer<T>) => PullProducer<[T, ...]>`
```js
import { pullWithLatest, pullFromIterable } from 'promised-streams'

const pp0 = pullFromIterable([10, 11])
const pp1 = pullFromIterable([20, 21])
const mainProducer = pullFromIterable([0, 1])

/* create PullProducer */
const withLatestProducer = pullWithLatest(pp0, pp1)(mainProducer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await withLatestProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // [0, null, null]
    // [1, 10, 20]
  }
} catch (e) {
  console.error(e)
}
```

### `pushWithLatest`
Creates `Push` producer, which streams values from `mainProducer`, combined with latest values from provided producers. Only `mainProducer` can initiate chunk delivery. Stream ends when `mainProducer` completes.
> `<...> (...producers: PushProducer<...>[]) => <T> (mainProducer: PushProducer<T>) => PushProducer<T, ...>`
```js
import { pushWithLatest, pushFromIterable } from 'promised-streams'

const pp0 = pushFromIterable([10, 11])
const pp1 = pushFromIterable([20, 21])
const mainProducer = pushFromIterable([0, 1])

const withLatestProducer = pushWithLatest(pp0, pp1)(mainProducer)

/* subscribe to PushProducer */
await withLatestProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // [0, 10, 20]
    // [1, 11, 21]
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullZip`
Creates `Pull` producer, which combines values from provided producers, to be delivered strictly in sync. Stream ends when one of producers completes.
> `<...> (...producers: PullProducer<...>[]) => PullProducer<[...]>`
```js
import { pullZip, pullFromIterable } from 'promised-streams'

const pp0 = pullFromIterable([0, 1, 2])
const pp1 = pullFromIterable([10, 11, 12])
const pp2 = pullFromIterable([20, 21, 22])

/* create PullProducer */
const zippedProducer = pullZip(pp0, pp1, pp2)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await zippedProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // [0, 10, 20]
    // [1, 11, 21]
    // [2, 12, 22]
  }
} catch (e) {
  console.error(e)
}
```

### `pushZip`
Creates `Push` producer, which combines values from provided producers, to be delivered strictly in sync. Stream ends when one of producers completes.
> `<...> (...producers: PushProducer<...>[]) => PushProducer<[...]>`
```js
import { pushZip, pushFromIterable } from 'promised-streams'

const pp0 = pushFromIterable([0, 1, 2])
const pp1 = pushFromIterable([10, 11, 12])
const pp2 = pushFromIterable([20, 21, 22])

/* create zip PushProducer */
const zippedProducer = pushZip(pp0, pp1, pp2)

/* subscribe to PushProducer */
await zippedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // [0, 10, 20]
    // [1, 11, 21]
    // [2, 12, 22]
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## Filtering

### `pullFilter`
Creates `Pull` producer, which streams data, filtered by provided predicate function.
> `<T> (predicate: (arg: T) => Promise<boolean> | boolean) => (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullFilter, pullFromIterable } from 'promised-streams'

const producer = pullFromIterable([0, 1, 2, 3])

const isEven = x => x % 2 === 0

/* create filtered producer */
const filteredProducer = pullFilter(isEven)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await filteredProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 2
  }
} catch (e) {
  console.error(e)
}
```

### `pushFilter`
Creates `Push` producer, which streams data, filtered by provided predicate function.
> `<T> (predicate: (arg: T) => Promise<boolean> | boolean) => (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushFilter, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2, 3])

const isEven = x => x % 2 === 0

/* create filtered producer */
const filteredProducer = compose(
  producer,
  pushFilter(isEven)
)

/* subscribe to PushProducer */
await filteredProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 2
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullDistinct`
Creates `Pull` producer, which streams data, filtered by provided `isAllowed` function.
> `<T> (isAllowed: (prev: T | undefined, next: T) => Promise<boolean> | boolean) => (producer: PullProducer<T>) => PullProducer<T>`

For the very first chunk `prev` is `undefined`.
```js
import { pullDistinct, pullFromIterable } from 'promised-streams'

const producer = pullFromIterable([0, 0, 1, 2, 2])

const isAllowed = (prev, next) => prev !== next

/* create filtered PullProducer */
const filteredProducer = pullDistinct(isAllowed)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await filteredProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
    // 2
  }
} catch (e) {
  console.error(e)
}
```

### `pushDistinct`
Creates `Push` producer, which streams data, filtered by provided `isAllowed` function.
> `<T> (isAllowed: (prev: T | undefined, next: T) => Promise<boolean> | boolean) => (consumer: PushConsumer<T>) => PushConsumer<T>`

For the very first chunk `prev` is `undefined`.
```js
import { pushDistinct, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 0, 1, 2, 2])

const isAllowed = (prev, next) => prev !== next

/* create filtered producer */
const filteredProducer = compose(
  producer,
  pushDistinct(isAllowed)
)

/* subscribe to PushProducer */
await filteredProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
    // 2
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullDistinctUntilChanged`
Creates `Pull` producer, passing only chunks which are different than previous one.
> `<T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullDistinctUntilChanged, pullFromIterable } from 'promised-streams'

const producer = pullFromIterable([0, 0, 1, 2, 2])

/* create filtered PullProducer */
const filteredProducer = pullDistinctUntilChanged(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await filteredProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
    // 2
  }
} catch (e) {
  console.error(e)
}
```

### `pushDistinctUntilChanged`
Creates `Push` producer, passing only chunks which are different than previous one.
> `<T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushDistinctUntilChanged, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 0, 1, 2, 2])
/* create filtered producer */
const filteredProducer = compose(
  producer,
  pushDistinctUntilChanged
)

/* subscribe to PushProducer */
await filteredProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
    // 2
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullUnique`
Creates `Pull` producer, passing only chunks which are unique to whole previous sequence.
> `<T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullUnique, pullFromIterable } from 'promised-streams'

const producer = pullFromIterable([0, 1, 2, 0, 1, 2])

/* create filtered PullProducer */
const filteredProducer = pullUnique(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await filteredProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
    // 2
  }
} catch (e) {
  console.error(e)
}
```

### `pushUnique`
Creates `Push` producer, passing only chunks which are unique to whole previous sequence.
> `<T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushUnique, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2, 0, 1, 2])

/* create filtered producer */
const filteredProducer = compose(
  producer,
  pushUnique
)

/* subscribe to PushProducer */
await filteredProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
    // 2
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pushDebounce`
Creates `Push` producer, debouncing the sequence of chunks by `WaitFn` function.
> `(wait: WaitFn) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`

> `type WaitFn = (cb: () => void) => () => void`

`WaitFn` schedules the provided `cb` and returns a function that cancels the pending call.
```js
import { pushDebounce, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2, 3])

/* schedule cb after 1000ms, return a cancel function */
const waitFn = (cb) => {
  const id = setTimeout(cb, 1000)
  return () => clearTimeout(id)
}

/* create debounced producer */
const debouncedProducer = compose(
  producer,
  pushDebounce(waitFn)
)

/* subscribe to PushProducer */
await debouncedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 3
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pushDebounceTime`
Creates `Push` producer, debouncing the sequence of chunks by time interval provided.
> `(ms: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushDebounceTime, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2, 3])

/* create debounced producer */
const debouncedProducer = compose(
  producer,
  pushDebounceTime(1000)
)

/* subscribe to PushProducer */
await debouncedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 3
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pushThrottle`
Creates `Push` producer, throttling the sequence of chunks by `WaitFn` function.
> `(wait: WaitFn) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`

> `type WaitFn = (cb: () => void) => () => void`

`WaitFn` schedules the provided `cb` and returns a function that cancels the pending call.
```js
import { pushThrottle, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2, 3])

/* schedule cb after 100ms, return a cancel function */
const waitFn = (cb) => {
  const id = setTimeout(cb, 100)
  return () => clearTimeout(id)
}

/* create throttled producer */
const throttledProducer = compose(
  producer,
  pushThrottle(waitFn)
)

/* subscribe to PushProducer */
await throttledProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pushThrottleTime`
Creates `Push` producer, throttling the sequence of chunks by time interval provided.
> `(ms: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushThrottleTime, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2, 3])

const throttledProducer = compose(
  producer,
  pushThrottleTime(100)
)

/* subscribe to PushProducer */
await throttledProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullSkip`
Creates `Pull` producer, which skips certain number of chunks in the beginning of sequence. If negative skip value was provided, the chunks will be skipped from the end of sequence.
> `(numSkip: number) => <T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullSkip, pullFromIterable } from 'promised-streams'

const producer = pullFromIterable([0, 1, 2, 3])

/* skip first 2 items */
const filteredProducer = pullSkip(2)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await filteredProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // 2
    // 3
  }
} catch (e) {
  console.error(e)
}
```
If negative skip value was provided, the chunks will be skipped from the end of sequence.
```js
import { pullSkip, pullFromIterable } from 'promised-streams'

const producer = pullFromIterable([0, 1, 2, 3])

/* skip last 2 items */
const filteredProducer = pullSkip(-2)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await filteredProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
  }
} catch (e) {
  console.error(e)
}
```

### `pushSkip`
Creates `Push` producer, which skips certain number of chunks in the beginning of sequence. If negative skip value was provided, the chunks will be skipped from the end of sequence.
> `(numSkip: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushSkip, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2, 3])

/* skip first 2 items */
const skippedProducer = compose(
  producer,
  pushSkip(2)
)

/* subscribe to PushProducer */
await skippedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 2
    // 3
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```
If negative skip value was provided, the chunks will be skipped from the end of sequence.
```js
import { pushSkip, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2, 3])

/* skip last 2 items */
const skippedProducer = compose(
  producer,
  pushSkip(-2)
)

/* subscribe to PushProducer */
await skippedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullTake`
Creates `Pull` producer, which takes only certain number of chunks in the beginning of sequence. If negative take value was provided, the chunks will be taken from the end of sequence.
> `(numTake: number) => <T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullTake, pullFromIterable } from 'promised-streams'

const producer = pullFromIterable([0, 1, 2, 3])

/* take first 2 items */
const filteredProducer = pullTake(2)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await filteredProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
  }
} catch (e) {
  console.error(e)
}
```
If negative take value was provided, the chunks will be taken from the end of sequence.
```js
import { pullTake, pullFromIterable } from 'promised-streams'

const producer = pullFromIterable([0, 1, 2, 3])

/* take last 2 items */
const filteredProducer = pullTake(-2)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await filteredProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // 2
    // 3
  }
} catch (e) {
  console.error(e)
}
```

### `pushTake`
Creates `Push` producer, which takes only certain number of chunks in the beginning of sequence. If negative take value was provided, the chunks will be taken from the end of sequence.
> `(numTake: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushTake, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2, 3])

/* take first 2 items */
const takeProducer = compose(
  producer,
  pushTake(2)
)

/* subscribe to PushProducer */
await takeProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```
If negative take value was provided, the chunks will be taken from the end of sequence.
```js
import { pushTake, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2, 3])

/* take last 2 items */
const takeProducer = compose(
  producer,
  pushTake(-2)
)

/* subscribe to PushProducer */
await takeProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 2
    // 3
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## Transformation

### `pullMap`
Creates `Pull` producer, which streams chunks transformed by `xf` function.
> `<T, R> (xf: (arg: T) => Promise<R> | R) => (producer: PullProducer<T>) => PullProducer<R>`
```js
import { pullMap, pullFromIterable } from 'promised-streams'

const producer = pullFromIterable([0, 1, 2, 3])

/* create PullProducer */
const transformProducer = pullMap(x => x * 2)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await transformProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 2
    // 4
    // 6
  }
} catch (e) {
  console.error(e)
}
```

### `pushMap`
Creates `Push` producer, which streams chunks transformed by `xf` function.
> `<T, R> (xf: (arg: T) => Promise<R> | R) => (consumer: PushConsumer<R>) => PushConsumer<T>`
```js
import { pushMap, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2, 3])

/* create PushProducer */
const transformProducer = compose(
  producer,
  pushMap(x => x * 2)
)

/* subscribe to PushProducer */
await transformProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 2
    // 4
    // 6
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullReduce`
Creates `Pull` producer, which will transform chunks by provided `reducer` function. The `reducer` will be invoked first time with no values provided, to get the initial state. The resulting stream will deliver exactly one chunk, at the end of sequence, with all values transformed through `reducer`, and the final state returned.
> `<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (producer: PullProducer<T>) => PullProducer<S>`
```js
import { pullReduce, pullFromIterable } from 'promised-streams'

const producer = pullFromIterable([0, 1, 2])

const reducer = (acc, value) => acc !== undefined ? acc + value : 0

/* create PullProducer */
const reducedProducer = pullReduce(reducer)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await reducedProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // 3
  }
} catch (e) {
  console.error(e)
}
```

### `pushReduce`
Creates `Push` producer, which will transform chunks by provided `reducer` function. The `reducer` will be invoked first time with no values provided, to get the initial state. The resulting stream will deliver exactly one chunk, at the end of sequence, with all values transformed through `reducer`, and the final state returned.
> `<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (consumer: PushConsumer<S>) => PushConsumer<T>`
```js
import { pushReduce, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2])

const reducer = (acc, value) => acc !== undefined ? acc + value : 0

const reducedProducer = compose(
  producer,
  pushReduce(reducer)
)

/* subscribe to PushProducer */
await reducedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 3
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullScan`
Creates `Pull` producer, which streams chunks transformed by `reducer` function. The `reducer` will be invoked first time with no values provided, to get the initial state. The resulting stream will deliver state on every new chunk passed to the `reducer`.
> `<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (producer: PullProducer<T>) => PullProducer<S>`
```js
import { pullScan, pullFromIterable } from 'promised-streams'

const producer = pullFromIterable([0, 1, 2, 3])

const reducer = (acc, value) => acc !== undefined ? acc + value : 0

/* create PullProducer */
const reducedProducer = pullScan(reducer)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await reducedProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
    // 3
    // 6
  }
} catch (e) {
  console.error(e)
}
```

### `pushScan`
Creates `Push` producer, which streams chunks transformed by `reducer` function. The `reducer` will be invoked first time with no values provided, to get the initial state. The resulting stream will deliver state on every new chunk passed to the `reducer`.
> `<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (consumer: PushConsumer<S>) => PushConsumer<T>`
```js
import { pushScan, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2, 3])

const reducer = (acc, value) => acc !== undefined ? acc + value : 0

const reducedProducer = compose(
  producer,
  pushScan(reducer)
)

/* subscribe to PushProducer */
await reducedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
    // 3
    // 6
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullHoFlatten`
Creates `Pull` producer, which consumes stream of producers, and provides the stream of values from these producers, subscribing to them sequentially.
> `<T> (producer: PullProducer<PullProducer<T>>) => PullProducer<T>`
```js
import { pullHoFlatten, pullFromIterable } from 'promised-streams'

/* Get the Higher Order producer somehow */
const producer = pullFromIterable([
  pullFromIterable([0, 1]),
  pullFromIterable([2, 3])
])

const flattenedProducer = pullHoFlatten(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await flattenedProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
    // 2
    // 3
  }
} catch (e) {
  console.error(e)
}
```

### `pushHoFlatten`
Creates `Push` producer, which consumes stream of producers, and provides the stream of values from these producers, subscribing to them sequentially.
> `<T> (consumer: PushConsumer<T>) => PushConsumer<PushProducer<T>>`
```js
import { pushHoFlatten, pushFromIterable } from 'promised-streams'

/* Get the Higher Order producer somehow */
const producer = pushFromIterable([
  pushFromIterable([0, 1]),
  pushFromIterable([2, 3])
])

const flattenedProducer = compose(
  producer,
  pushHoFlatten
)

/* subscribe to PushProducer */
await flattenedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
    // 2
    // 3
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullFlatMap`
Creates `Pull` producer, which transforms stream of values to stream of producers through `xf`, and provides the stream of values from these producers, subscribing to them sequentially.
> `<T, R> (xf: (arg: T) => Promise<PullProducer<R>> | PullProducer<R>) => (producer: PullProducer<T>) => PullProducer<R>`
```js
import { pullFlatMap, pullFromIterable } from 'promised-streams'

const producer = pullFromIterable([0, 1, 2])

const mapAndFlatten = pullFlatMap(
  /* map to another pullProducer, creating Higher Order producer, and Flatten */
  (value) => pullFromIterable([value, value])
)

const flattenedProducer = mapAndFlatten(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await flattenedProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 0
    // 1
    // 1
    // 2
    // 2
  }
} catch (e) {
  console.error(e)
}
```

### `pushFlatMap`
Creates `Push` producer, which transforms stream of values to stream of producers through `xf`, and provides the stream of values from these producers, subscribing to them sequentially.
> `<T, R> (xf: (arg: T) => Promise<PushProducer<R>> | PushProducer<R>) => (consumer: PushConsumer<R>) => PushConsumer<T>`
```js
import { pushFlatMap, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2])

const mapAndFlatten = pushFlatMap(
  /* map to another pushProducer, creating Higher Order producer, and Flatten */
  (value) => pushFromIterable([value, value])
)

const flattenedProducer = compose(
  producer,
  mapAndFlatten
)

/* subscribe to PushProducer */
await flattenedProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 0
    // 1
    // 1
    // 2
    // 2
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## Side Effects

### `pullDo`
Creates `Pull` producer, which passes incoming values to `doFunction`, waiting for the promise if necessary, ignoring the exceptions, then continues unchanged value to the stream.
> `<T> (doFunction: (arg: T) => Promise<void> | void) => (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullDo, pullFromIterable } from 'promised-streams'

const producer = pullFromIterable([0, 1, 2, 3])

const sideEffectProducer = pullDo(
  /* waits until fetch promise resolves */
  (value) => fetch(`http://hostname:3000?value=${value}`)
)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await sideEffectProducer()

    if (done) {
      break
    }

    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
    // 2
    // 3
  }
} catch (e) {
  console.error(e)
}
```

### `pushDo`
Creates `Push` producer, which passes incoming values to `doFunction`, waiting for the promise if necessary, ignoring the exceptions, then continues unchanged value to the stream.
> `<T> (doFunction: (result: T) => Promise<void> | void) => (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushDo, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2, 3])

const sideEffects = pushDo(
  /* waits until fetch promise resolves */
  (value) => fetch(`http://hostname:3000?value=${value}`)
)

const sideEffectProducer = compose(
  producer,
  sideEffects
)

/* subscribe to PushProducer */
await sideEffectProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)

    /* Values will be delivered in order */
    // 0
    // 1
    // 2
    // 3
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

### `pullSide`
Creates `Pull` producer, which passes incoming values to `sideFunction`, waiting for the promise if necessary, and delivers a rejection of `sideFunction` to the stream as an error. Unlike `pullDo`, a failing side effect is not ignored.
> `<T> (sideFunction: (value: T) => Promise<void> | void) => (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullSide, pullFromIterable } from 'promised-streams'

const producer = pullFromIterable([0, 1, 2, 3])

const sideEffectProducer = pullSide(
  /* waits until fetch promise resolves */
  (value) => fetch(`http://hostname:3000?value=${value}`)
)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await sideEffectProducer()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  /* a rejected side effect terminates the stream */
  console.error(e)
}
```

### `pushSide`
Creates `Push` producer, which passes incoming values to `sideFunction`, waiting for the promise if necessary, and delivers a rejection of `sideFunction` to the stream as an error. Unlike `pushDo`, a failing side effect is not ignored.
> `<T> (sideFunction: (value: T) => Promise<void> | void) => (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushSide, pushFromIterable } from 'promised-streams'

const producer = pushFromIterable([0, 1, 2, 3])

const sideEffects = pushSide(
  /* waits until fetch promise resolves */
  (value) => fetch(`http://hostname:3000?value=${value}`)
)

const sideEffectProducer = compose(
  producer,
  sideEffects
)

/* subscribe to PushProducer */
await sideEffectProducer(async (result) => {
  try {
    /* unwrap the value */
    const { value, done } = await result

    /* check if done */
    if (done) {
      return
    }

    /* consume the value */
    console.log(value)
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## Testing your streams

The companion package [`promised-streams-test`](https://www.npmjs.com/package/promised-streams-test) provides helpers to drive and observe producers/consumers in tests — `pushProducer`, `pushConsumer`, `pullProducer` and `pullConsumer`.

```sh
npm install --save-dev promised-streams-test
```

## License

[MIT](LICENSE) © [psxcode](https://github.com/psxcode)
