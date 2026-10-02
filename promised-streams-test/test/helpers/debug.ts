type Logger = (...args: unknown[]) => void

const isEnabled = (namespace: string, pattern: string | undefined): boolean => {
  if (!pattern) {
    return false
  }

  return pattern.split(',').some((part) => {
    const token = part.trim()

    return (
      token === namespace ||
      token === '*' ||
      (token.endsWith('*') && namespace.startsWith(token.slice(0, -1)))
    )
  })
}

export const debug = (namespace: string): Logger => {
  const enabled = isEnabled(namespace, process.env.DEBUG)

  return (...args) => {
    if (enabled) {
      console.log(namespace, ...args)
    }
  }
}
