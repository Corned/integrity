class GameState {
  constructor() {
    this.layers = {}
  }

  setLayer(layerName, layer) {
    this.layers[layerName] = layer
  }

  getLayer(layerName) {
    return this.layers[layerName]
  }

  merge() {
    return []
  }
}

export default GameState