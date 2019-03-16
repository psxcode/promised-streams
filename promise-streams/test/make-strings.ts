const makeStrings = (length: number): Iterable<string> => ({
  * [Symbol.iterator] () {
    for (let i = 0; i < length; ++i) {
      yield String(i)
    }
  },
})

export default makeStrings
