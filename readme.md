# Promised Streams
Promise-based Streams with `pressure` control, `Error` delivery and lots of `RxJS`-like operators.

[![codecov](https://codecov.io/gh/psxcode/promised-streams/branch/master/graph/badge.svg)](https://codecov.io/gh/psxcode/promised-streams)
[![Build Status](https://travis-ci.org/psxcode/promised-streams.svg?branch=master)](https://travis-ci.org/psxcode/promised-streams)

## Install

```sh
npm install promised-streams
```

## `Pull` streams
```js
import { pullFromIterable, pullMap, pullFilter, pullTake } from 'promised-streams'

const data = [0, 1, 2, 3, 4]

const pipedTransforms = pipe(
  pullFilter(x => x % 2 === 0)
  pullMap(x => x * 2)
  pullTake(-1)
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
}
```

## `Push` streams
```js
import { pushFromIterable, pushMap, pushFilter, pushTake } from 'promised-streams'

const data = [0, 1, 2, 3, 4]

const composedProducer = compose(
  pushFromIterable(data),
  pushFilter(x => x % 2 === 0)
  pushMap(x => x * 2)
  pushTake(-1)
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
})
```

- [Promised Streams](#promised-streams)
  - [Install](#install)
  - [`Pull` streams](#pull-streams)
  - [`Push` streams](#push-streams)
  - [Terminology](#terminology)
  - [Iterator Protocol](#iterator-protocol)
  - [Async Iterator Protocol](#async-iterator-protocol)
  - [Publish / Subscribe Protocol](#publish--subscribe-protocol)
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


## Terminology

`Push` type streams, where values are eagerly pushed by `producer` to `consumer`, as soon as available.  
`Pull` type stream, where values are lazily pulled by `consumer` from `producer`, as soon as needed.  
`Pressure` is a special data channel, carrying information about data saturation in the stream.

`PushProducer` is an active, `push` type producer, which pushes values to consumer, as soon as they are available.  
`PushConsumer` is a passive, `push` type consumer, which waits for values to arrive from producer.  
`Pressure` information in such streams is delivered from `consumer` to `producer`, in term of high pressure, or data consumption is in progress.

`PullConsumer` is an active, `pull` type consumer, which pulls values from producer as needed.  
`PullProducer` is a passive, `pull` type producer, which provides values to be pulled from.  
`Pressure` information is delivered from `producer` to `consumer`, in term of low pressure, or data production is in progress. 

`Pool`.  
`Pump`.  

## Iterator Protocol
Standard Javascript iterator protocol carries data and end of the iteration indicator  
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
Adding Javascript Promises to the Iterator Protocol allows to carry additional information
```js
const iterator = getIterator(data)

const chunkPromise = iterator.next() // Promise<{ value, done }>

const chunk = await chunkPromise
```
Features of Asynchronous Iterator Protocol
- Lazy data requests, by calling `next` when needed.
- Async data delivery in chunks, by `await chunkPromise`.
- Async `Error` delivery by `rejected` Promises.
- End of stream indication by `{ value: undefined,  done: true }`.

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
But still no `end of stream` and `pressure` respect. 

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
Now its easy to add support for `pressure` control.  
`Producer` must first resolve `Promise` returned by `Subscriber` function, and only after that send next value. We could also add `await` operator for `consumeChunk` function call...
```js
await consumeChunk(chunk.value)
```
Thus making `producer` to wait for chunk to be actually processed, before sending next one.

## Interfaces

`type PushConsumer <T> = (value: Promise<IteratorResult<T>>) => Promise<void>`  
`PushConsumer` is just a function which accepts a value and returns a `Promise` to have time to consume the chunk. This promise can be `rejected` to indicate error during data processing, or unsubscribe. Producer will immediately stop data delivery to unsubscribed consumer.

`type PushProducer <T> = (consumer: PushConsumer<T>) => Promise<void>`  
`PushProducer` is a function accepting `PushConsumer`. After getting a consumer, producer begins sending data to consumer. `PushProducer` returns a `Promise`, which resolves after all data was pushed to consumer. This promise will never be rejected. All error during data production will be forwarded to consumer.

`type PullProducer <T> = () => Promise<IteratorResult<T>>`  
`PullProducer` is a function which returns a chunk of data, delivered as `Promise` to `IteratorResult`. Promise can be rejected by producer to indicate an `Error`.  

`type PullConsumer <T> = (producer: PullProducer<T>) => Promise<void>`  
`PullConsumer` is a function accepting `PullProducer`. After getting the producer, consumer begins pulling the data. `PullConsumer` returns a Promise, which will be resolved after add data was pulled, or will be rejected if producer delivered an `Error`.

# Creation
## `pullFromIterable`
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

## `pushFromIterable`
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

## `pullFromStream`
Creates `Pull` type producer, which will deliver data from NodeJS stream.  
> `<T> (stream: NodeJS.ReadableStream) => PullProducer<T>`
```js
import { pullFromStream } from 'promised-streams'

const readable = createStream()
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

## `pushFromStream`
Creates `Push` type producer, which will deliver data from NodeJS stream.  
> `<T> (stream: NodeJS.ReadableStream) => PushProducer<T>`
```js
import { pushFromStream } from 'promised-streams'

const readable = createStream()
const pushProducer = pushFromStream()

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

# Conversion

## `pool`
Converts `Push` type producer to `Pull` type producer.  
> `<T> (options: IPoolOptions) => IPool<T>`

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

## `pump`
Converts `Pull` type producer to `Push` type producer.  
> `<T> (producer: PullProducer<T>) => PushProducer<T>`
```js
import { pump } from 'promised-streams'

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

# Combination

## `pullConcat`
Creates concatenated `Pull` producer, which will deliver data from provided producers sequentially. Once first producer is `done`, stream will switch to the next one. `done` chunk will be delivered once, when all producers are complete.
> `<T> (...producers: PullProducers<T>[]) => PullProducer<T>`
```js
import { pullConcat } from 'promised-streams'

const pp0 = getPullProducer()
const pp1 = getPullProducer()
const pp2 = getPullProducer()

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

## `pushConcat`
Concatenates all `Push` producers, creating single `Push` producer, which delivers the data from each, excluding `done`. End of stream is delivered once, at the end.
> `<T> (...producers: PushProducer<T>[]) => PushProducer<T>`
```js
import { pushConcat } from 'promised-streams'

const pp0 = getPushProducer()
const pp1 = getPushProducer()
const pp2 = getPushProducer()

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

## `pullCombine`
Creates combined `Pull` producer. Each latest chunk from provided producers is combined with others into an array, which is updated and delivered each time any of producers has new value. If one of producers ends, its latest value is remembered, and is delivered with values from other producers. Once all producers are `done`, the stream completes.
> `<...> (...producers: PullProducers<...>[]) => PullProducer<[...]>`
```js
import { pullCombine } from 'promised-streams'

const pp0 = getPullProducer() // [0, 1]
const pp1 = getPullProducer() // [2, 3]
const pp2 = getPullProducer() // [4, 5]

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

## `pushCombine`
Creates combined `Push` producer. Each latest chunk from provided producers is combined with others into an array, which is updated and delivered each time any of producers has new value. If one of producers ends, its latest value is remembered, and is delivered with values from other producers. Once all producers are `done`, the stream completes.
> `<...> (...producers: PushProducer<...>[]) => PushProducer<[...]>`
```js
import { pushCombine } from 'promised-streams'

const pp0 = getPushProducer() // [0, 1]
const pp1 = getPushProducer() // [2, 3]
const pp2 = getPushProducer() // [4, 5]

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

## `pullMerge`
Creates `Pull` producer, which delivers values from provided producers as soon as available, so the values from all producers are mixed with each other in the resulting stream. Stream ends when all producers are complete.
> `<...> (...producers: PullProducers<...>[]) => PullProducer<...>`
```js
import { pullMerge } from 'promised-streams'

const pp0 = getPullProducer()
const pp1 = getPullProducer()
const pp2 = getPullProducer()

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

## `pushMerge`
Creates `Push` producer, which delivers values from provided producers as soon as available, so the values from all producers are mixed with each other in the resulting stream. Stream ends when all producers are complete.
> `<...> (...producers: PushProducer<...>[]) => PushProducer<...>`
```js
import { pushMerge } from 'promised-streams'

const pp0 = getPushProducer()
const pp1 = getPushProducer()
const pp2 = getPushProducer()

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

## `pullStartWith`
Creates `Pull` producer, which will stream values starting with provided ones.
> `<T> (...values: T[]) => (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullStartWith } from 'promised-streams'

const producer = getPullProducer()
/* create PullProducer */
const startWithProducer = pullStartWith(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await startWithProducer()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  console.error(e)
}
```

## `pushStartWith`
Creates `Push` producer, which will stream values starting with provided ones.
> `<T> (...values: T[]) => (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushStartWith } from 'promised-streams'

const producer = getPushProducer()

const startWithProducer = pushStartWith(1, 2, 3)(producer)

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
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullWithLatest`
Creates `Pull` producer, which streams values from `mainProducer`, combined with latest values from provided producers. Only `mainProducer` can initiate chunk delivery. Stream ends when `mainProducer` completes.
> `<...> (...producers: PullProducer<...>[]) => <T>(mainProducer: PullProducer<T>) => PullProducer<[T, ...]>`
```js
import { pullWithLatest } from 'promised-streams'

const pp0 = getPullProducer()
const pp1 = getPullProducer()
const pp2 = getPullProducer()
const mainProducer = getPullProducer()

/* create PullProducer */
const withLatestProducer = pullWithLatest(pp0, pp1, pp2)(mainProducer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await withLatestProducer()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  console.error(e)
}
```

## `pushWithLatest`
Creates `Push` producer, which streams values from `mainProducer`, combined with latest values from provided producers. Only `mainProducer` can initiate chunk delivery. Stream ends when `mainProducer` completes.
> `<...> (...producers: PushProducer<...>[]) => <T> (mainProducer: PushProducer<T>) => PushProducer<T, ...>`
```js
import { pushWithLatest } from 'promised-streams'

const pp0 = getPushProducer()
const pp1 = getPushProducer()
const pp2 = getPushProducer()
const mainProducer = getPushProducer()

const withLatestProducer = (pp0, pp1, pp2)(mainProducer)

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
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullZip`
Creates `Pull` producer, which combines values from provided producers, to be delivered strictly in sync. Stream ends when one of producers completes.
> `<...> (...producers: PullProducer<...>[]) => PullProducer<[...]>`
```js
import { pullZip } from 'promised-streams'

const pp0 = getPullProducer()
const pp1 = getPullProducer()
const pp2 = getPullProducer()

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
  }
} catch (e) {
  console.error(e)
}
```

## `pushZip`
Creates `Push` producer, which combines values from provided producers, to be delivered strictly in sync. Stream ends when one of producers completes.
> `<...> (...producers: PushProducer<...>[]) => PushProducer<[...]>`
```js
import { pushZip } from 'promised-streams'

const pp0 = getPushProducer()
const pp1 = getPushProducer()
const pp2 = getPushProducer()

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
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

# Filtering

## `pullFilter`
Creates `Pull` producer, which streams data, filtered by provided predicate function.
> `<T> (predicate: (arg: T) => Promise<boolean> | boolean) => (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullFilter } from 'promised-streams'

const producer = getPullProducer()

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
  }
} catch (e) {
  console.error(e)
}
```

## `pushFilter`
Creates `Push` producer, which streams data, filtered by provided predicate function.
> `<T> (predicate: (arg: T) => Promise<boolean> | boolean) => (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushFilter } from 'promised-streams'

const producer = getPushProducer()

const isEven = x => x % 2 === 0

/* create filtered producer */
const filteredProducer = pushFilter(isEven)(producer)

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
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullDistinct`
Creates `Pull` producer, which streams data, filtered by provided `isAllowed` function.
> `<T> (isAllowed: (prev: T, next: T) => Promise<boolean> | boolean) => (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullDistinct } from 'promised-streams'

const isAllowed = (prev, next) => prev !== next

const producer = getPullProducer()
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
  }
} catch (e) {
  console.error(e)
}
```

## `pushDistinct`
Creates `Push` producer, which streams data, filtered by provided `isAllowed` function.
> `<T> (isAllowed: (prev: T, next: T) => Promise<boolean> | boolean) => (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushDistinct } from 'promised-streams'

const isAllowed = (prev, next) => prev !== next

const producer = getPushProducer()
/* create filtered producer */
const filteredProducer = pushDistinct(isAllowed)(producer)

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
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullDistinctUntilChanged`
Creates `Pull` producer, passing only chunks which are different than previous one.
`<T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullDistinctUntilChanged } from 'promised-streams'

const producer = getPullProducer()
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
  }
} catch (e) {
  console.error(e)
}
```

## `pushDistinctUntilChanged`
Creates `Push` producer, passing only chunks which are different than previous one.
> `<T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushDistinctUntilChanged } from 'promised-streams'

const producer = getPushProducer()
/* create filtered producer */
const filteredProducer = pushDistinctUntilChanged(producer)

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

## `pullUnique`
Creates `Pull` producer, passing only chunks which are unique to whole previous sequence.
> `<T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullUnique } from 'promised-streams'

const producer = getPullProducer()
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
  }
} catch (e) {
  console.error(e)
}
```

## `pushUnique`
Creates `Push` producer, passing only chunks which are unique to whole previous sequence.
> `<T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushUnique } from 'promised-streams'

const producer = getPushProducer()
/* create filtered producer */
const filteredProducer = pushUnique(producer)

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
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pushDebounce`
Creates `Push` producer, debouncing the sequence of chunks by `WaitFn` function.
> `(wait: WaitFn) => <T> (consumer: PushConsumer<T>): PushConsumer<T>`

> `type WaitFn = () => Promise<void>`
```js
import { pushDebounce } from 'promised-streams'

const waitFn = () => new Promise((resolve) => setTimeout(resolve, 1000))

const producer = getPushProducer()
/* create debounced producer */
const debouncedProducer = pushDebounce(waitFn)(producer)

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
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pushDebounceTime`
Creates `Push` producer, debouncing the sequence of chunks by time interval provided.
> `(ms: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushDebounceTime } from 'promised-streams'

const producer = getPushProducer()
/* create debounced producer */
const debouncedProducer = pushDebounceTime(1000)(producer)

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
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pushThrottle`
Creates `Push` producer, throttling the sequence of chunks by `WaitFn` function.
> `(wait: WaitFn) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`

> `type WaitFn = () => Promise<void>`
```js
import { pushThrottle } from 'promised-streams'

const waitFn = () => new Promise((resolve) => setTimeout(resolve, 100))

const producer = getPushProducer()
/* create throttled producer */
const throttledProducer = pushThrottle(waitFn)(producer)

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

## `pushThrottleTime`
Creates `Push` producer, throttling the sequence of chunks by time interval provided.
> `(ms: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushThrottleTime } from 'promised-streams'

const producer = getPushProducer()
const throttledProducer = pushThrottleTime(100)(producer)

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

## `pullSkip`
Creates `Pull` provider, which skips certain number of chunks in the beginning of sequence. If negative skip value was provided, the chunks will be skipped from the end of sequence.
> `(numSkip: number) => <T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullSkip } from 'promised-streams'

const producer = getPullProducer()
/* skip first 3 items */
const filteredProducer = pullSkip(3)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await filteredProducer()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  console.error(e)
}
```
If negative skip value was provided, the chunks will be skipped from the end of sequence.
```js
import { pullSkip } from 'promised-streams'

const producer = getPullProducer()
/* skip last 3 items */
const filteredProducer = pullSkip(-3)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await filteredProducer()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  console.error(e)
}
```

## `pushSkip`
Creates `Push` provider, which skips certain number of chunks in the beginning of sequence. If negative skip value was provided, the chunks will be skipped from the end of sequence.
> `(numSkip: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushSkip } from 'promised-streams'

const producer = getPushProducer()
/* skip first 3 items */
const skippedProducer = pushSkip(3)(producer)

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
import { pushSkip } from 'promised-streams'

const producer = getPushProducer()
/* skip last 3 items */
const skippedProducer = pushSkip(-3)(producer)

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
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullTake`
Creates `Pull` provider, which takes only certain number of chunks in the beginning of sequence. If negative take value was provided, the chunks will be taken from the end of sequence.
> `(numTake: number) => <T> (producer: PullProducer<T>) => PullProducer<T>`
```js
import { pullTake } from 'promised-streams'

const producer = getPullIterable()
/* take first 3 items */
const filteredProducer = pullTake(3)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await filteredProducer()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  console.error(e)
}
```
If negative take value was provided, the chunks will be taken from the end of sequence.
```js
import { pullTake } from 'promised-streams'

const producer = getPullIterable()
/* take last 3 items */
const filteredProducer = pullTake(-3)(producer)

try {
  /* consume PullProducer */
  while (true) {
    const { value, done } = await filteredProducer()

    if (done) {
      break
    }

    console.log(value)
  }
} catch (e) {
  console.error(e)
}
```

## `pushTake`
Creates `Push` provider, which skips certain number of chunks in the beginning of sequence. If negative skip value was provided, the chunks will be skipped from the end of sequence.
> `(numTake: number) => <T> (consumer: PushConsumer<T>) => PushConsumer<T>`
```js
import { pushTake } from 'promised-streams'

const producer = getPushProducer()
/* take first 3 items */
const takeProducer = pushTake(3)(producer)

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
If negative take value was provided, the chunks will be taken from the end of sequence.
```js
import { pushTake } from 'promised-streams'

const producer = getPushProducer()
/* take last 3 items */
const takeProducer = pushTake(-3)(producer)

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

# Transformation

## `pullMap`
Creates `Pull` producer, which streams chunks transformed by `xf` function.
> `<T, R> (xf: (arg: T) => Promise<R> | R) => (producer: PullProducer<T>) => PullProducer<R>`
```js
import { pullMap } from 'promised-streams'

const producer = getPullProducer()
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
  }
} catch (e) {
  console.error(e)
}
```

## `pushMap`
Creates `Push` producer, which streams chunks transformed by `xf` function.
> `<T, R> (xf: (arg: T) => Promise<R> | R) => (consumer: PushConsumer<R>) => PushConsumer<T>`
```js
import { pushMap } from 'promised-streams'

const producer = getPushProducer()
/* create PushProducer */
const transformProducer = pushMap(x => x * 2)(producer)

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
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullReduce`
Creates `Pull` producer, which will transform chunks by provided `reducer` function. The `reducer` will be invoked first time with no values provided, to get the initial state. The resulting stream will deliver exactly one chunk, at the end of sequence, with all values transformed through `reducer`, and the final state returned.
> `<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (producer: PullProducer<T>) => PullProducer<S>`
```js
import { pullReduce } from 'promised-streams'

const reducer = (acc, value) => acc !== undefined ? acc + value : 0

const producer = getPullProducer(data)
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
  }
} catch (e) {
  console.error(e)
}
```

## `pushReduce`
Creates `Push` producer, which will transform chunks by provided `reducer` function. The `reducer` will be invoked first time with no values provided, to get the initial state. The resulting stream will deliver exactly one chunk, at the end of sequence, with all values transformed through `reducer`, and the final state returned.
> `<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (consumer: PushConsumer<S>) => PushConsumer<T>`
```js
import { pushReduce } from 'promised-streams'

const reducer = (acc, value) => acc !== undefined ? acc + value : 0

const producer = getPushProducers()
const reducedProducer = pushReduce(reducer)(producer)

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
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```

## `pullScan`
Creates `Pull` producer, which streams chunks transformed by `reducer` function. The `reducer` will be invoked first time with no values provided, to get the initial state. The resulting stream will deliver state on every new chunk passed to the `reducer`.
> `<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (producer: PullProducer<T>) => PullProducer<S>`
```js
import { pullScan } from 'promised-streams'

const reducer = (acc, value) => acc !== undefined ? acc + value : 0

const producer = getPullProducer(data)
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
  }
} catch (e) {
  console.error(e)
}
```

## `pushScan`
Creates `Push` producer, which streams chunks transformed by `reducer` function. The `reducer` will be invoked first time with no values provided, to get the initial state. The resulting stream will deliver state on every new chunk passed to the `reducer`.
> `<S, T> (reducer: (state?: S, value?: T) => Promise<S> | S) => (consumer: PushConsumer<S>) => PushConsumer<T>`
```js
import { pushScan } from 'promised-streams'

const reducer = (acc, value) => acc !== undefined ? acc + value : 0

const producer = getPushProducers()
const reducedProducer = pushScan(reducer)(producer)

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
  } catch (e) {
    /* catch errors */
    console.error(e)

    /* cancel subscription */
    return Promise.reject()
  }
})
```
