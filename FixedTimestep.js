export class FixedTimestep {
  constructor(dt = 1 / 60, maxSubSteps = 5) {
    this.dt = dt
    this.maxSubSteps = maxSubSteps
    this.accumulator = 0
    this.lastTimestamp = null
  }

  update(timestamp) {
    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp
      return 0
    }

    const frameDelta = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1)
    this.lastTimestamp = timestamp
    this.accumulator += frameDelta

    let steps = 0
    while (this.accumulator >= this.dt && steps < this.maxSubSteps) {
      this.accumulator -= this.dt
      steps += 1
    }

    return steps
  }
}
