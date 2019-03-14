const isPositiveNumber = (num?: number) => num !== undefined && isFinite(num) && num >= 0

export default isPositiveNumber
