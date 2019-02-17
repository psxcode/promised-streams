const isPositiveNumber = (i?: number) => typeof i === 'number' && isFinite(i) && i >= 0

export default isPositiveNumber
