class Layer {
  constructor() {
    this.data = []
    this.canCollide = false
  }

  get(x, y) {
    return this.data[y]?.[x]
  }

  set(x, y, value) {
    if (!this.data[y]) this.data[y] = []
    this.data[y][x] = value
  }
}

export default Layer