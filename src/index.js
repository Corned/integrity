import "./index.scss"
import mapData from "./assets/map.txt"

import GameState from "./GameState.js"
import Layer from "./Layer.js"


let playerX = 24
let playerY = 14

let viewportSizeX = 50
let viewportSizeY = 50
let viewportOffsetX = 0
let viewportOffsetY = 0
let maxViewportOffsetX = 0
let maxViewportOffsetY = 0

const cellSize = 13

// for shadowcasting, testing
class ShadowLine {
  constructor() {
    this.shadows = []
  }

  isInShadow(projection) {
    for (const shadow in this.shadows) {
      if (shadow.contains(projection)) return true
    }

    return false
  }
}

class Shadow {
  constructor(start, end) {
    this.start = start
    this.end = end
  }

  contains(other) {
    return this.start <= other.start && this.end >= other.end
  }
}

const projectTile = (row, col) => {
  const topLeft = col / (row + 2)
  const bottomRight = (col + 1) / (row + 1)
  return new Shadow(topLeft, bottomRight)
}

//
const lastDraw = []
const saveLastDraw = (x, y, data) => {
  if (!lastDraw[y]) lastDraw[y] = []
  lastDraw[y][x] = data
}


const state = new GameState(mapData)

// Create environment layer
// Mostly walls
const environmentLayer = new Layer()
for (const [ y, line ] of mapData.split("\n").entries()) {
  for (const [ x, character ] of line.trim().split("").entries()) {
    if (character === "#") {
      environmentLayer.set(x, y, "#")
    } else {
      environmentLayer.set(x, y, ".")
    }
  }
}

state.setLayer("environment", environmentLayer)
state.setLayer("shadow", new Layer())

function getRndColor() {
  var r = 255*Math.random()|0,
      g = 255*Math.random()|0,
      b = 255*Math.random()|0;
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

const render = () => {
  const canvas = document.getElementById("screen")
  const ctx = canvas.getContext("2d")

  const width = canvas.width
  const height = canvas.height

  ctx.clearRect(0, 0, width, height)

  ctx.font = "16px LilliputSteps"
  ctx.fillStyle = "white"


  const updateColor = getRndColor()

  for (let y = Math.floor(-viewportSizeY / 2); y <= Math.ceil(viewportSizeY / 2); y++) {
    for (let x = Math.floor(-viewportSizeX / 2); x <= Math.ceil(viewportSizeX / 2); x++) {
      const x_ = x + playerX 
      const y_ = y + playerY 
      const cell = state.getLayer("environment").get(x_, y_) || "~"

      if (lastDraw[y]?.[x] === cell) {
        //continue
      }

      saveLastDraw(x, y, cell)

      ctx.fillStyle = updateColor
      ctx.fillRect(width / 2 + x * cellSize, height / 2 + y * cellSize, cellSize, -cellSize)
      ctx.clearRect(width / 2 + x * cellSize, height / 2 + y * cellSize, cellSize, -cellSize)

      if (x_ === playerX && y_ === playerY) {
        ctx.font = "italic 16px LilliputSteps"
        ctx.fillStyle = "goldenrod"
        ctx.fillText("C", width / 2 + (x) * cellSize, height / 2 + y * cellSize)
        
      } else {
        ctx.font = "16px LilliputSteps"
        ctx.fillStyle = "white"
        ctx.fillText(cell, width / 2 + x * cellSize, height / 2 + y * cellSize)
      }
    }
  }
}


const shadowcast = (playerX, playerY) => {
  console.log("==== shadowcast");
  let castDistance = 50

  const canvas = document.getElementById("screen")
  const ctx = canvas.getContext("2d")

  const width = canvas.width
  const height = canvas.height


  ctx.font = "16px LilliputSteps"
  ctx.fillStyle = "red"

  let yDir = -1
  let xDir = 1

  const transformOctant = (row, col, octant) => {
    switch (octant) {
      case 0: return [ row,  col ]
      case 1: return [-col, -row ]
      case 2: return [-col,  row ]
      case 3: return [ row, -col ]
      case 4: return [-row, -col ]
      case 5: return [ col,  row ]
      case 6: return [ col, -row ]
      case 7: return [-row,  col ]
    }
  }

  const octantColors = [
    "rgba(255, 0, 0, 0.5)",
    "rgba(0, 255, 0, 0.5)",
    "rgba(0, 0, 255, 0.5)",
    "rgba(255, 255, 0, 0.5)",
    "rgba(0, 255, 255, 0.5)",
    "rgba(255, 0, 255, 0.5)",
    "rgba(50, 255, 150, 0.5)",
    "rgba(255, 100, 0, 0.5)",
  ]

  
  for (let octant = 0; octant <= 7; octant++) {
    const shadows = []

    const isInShadow = (shadow, other) => {
      return (shadow[0]-0.08) <= (other[0]) && (shadow[1]+0.08) >= (other[1])
    }

    for (let row = 1; row <= castDistance; row++) {
      let previousWall = false
      
      for (let col = 0; col <= row; col++) {
        // x y are relative to octant relative to playerX playerY
        const [ x, y ] = transformOctant(col * xDir, row * yDir, octant)
        const cell = state.getLayer("environment").get(playerX + x, playerY + y) || "~"

        if (!cell) continue

        const [ a, b ] = transformOctant(1, 1, octant)
        
        const centerX = width / 2 + x * cellSize + cellSize / 2
        const centerY = height / 2 + (y-1) * cellSize + cellSize / 2

        const topLeftX = centerX - a * cellSize / 2 
        const topLeftY = centerY - b * cellSize / 2
        const bottomRightX = centerX - a / 2 + (cellSize/2) * a
        const bottomRightY = centerY - a / 2 + (cellSize/2) * b

        const angles = [
          x / y * (octant%2===0?-1:1),
          (x + a) / (y + b) * (octant%2===0?-1:1)
        ]

        if (y === 0 || y + b === 0) continue

        if (cell === "#") {
          // wall


          for (const shadow of shadows) {
            if (isInShadow(shadow, angles)) {
              state.getLayer("shadow").set(playerX + x, playerY + y, 1)
              continue
            }
          }

          if (previousWall) {
            shadows[shadows.length - 1] = [ shadows[shadows.length - 1][0], angles[1] ]
            continue
          }

          shadows.push(angles)
        
          previousWall = true
        } else {
          // not a wall
          previousWall = false

          for (const shadow of shadows) {
            if (isInShadow(shadow, angles)) {
              state.getLayer("shadow").set(playerX + x, playerY + y, 1)
            }
          }

        }

/*         ctx.fillStyle = "black"
        ctx.fillRect(width / 2 + x * cellSize, height / 2 + (y * cellSize), cellSize, -cellSize)

        ctx.fillStyle = "white"
        ctx.fillText(`${col}`, width / 2 + x * cellSize, height / 2 + (y * cellSize), cellSize)

        ctx.strokeStyle = octantColors[octant]
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(topLeftX, topLeftY)
        ctx.lineTo(bottomRightX, bottomRightY)
        ctx.lineTo(centerX - a / 2 + (cellSize/2) * a / 2, bottomRightY)
        ctx.lineTo(bottomRightX, centerY - a / 2 + (cellSize/2) * b / 2)
        ctx.lineTo(bottomRightX, bottomRightY)
        ctx.stroke() */

      }

      const centerX = width / 2
      const centerY = height / 2


/*       for (const shadow of shadows) {
        console.log("SHADOW", shadow);
        ctx.lineWidth = 1

        
        ctx.strokeStyle = "red"
        ctx.beginPath()
        ctx.moveTo(centerX, centerY - 13)
        ctx.lineTo(centerX + 1000 * shadow[0], centerY - 1000)
        ctx.stroke()

        
        ctx.strokeStyle = "blue"
        ctx.beginPath()
        ctx.moveTo(centerX, centerY - 13)
        ctx.lineTo(centerX + 1000 * shadow[1], centerY - 1000)
        ctx.stroke()
      } */

    }
  }



  // Render shadow layer
  for (let octant = 0; octant <= 7; octant++) {

    // dx dy are relative to playerX playerY
    for (let row = 1; row <= castDistance; row++) {
      for (let col = 0; col <= row; col++) {
        const [ x, y ] = transformOctant(col * xDir, row * yDir, octant)
        const cell = state.getLayer("shadow").get(playerX + x, playerY + y)

        if (!cell) continue

        ctx.fillStyle = "black"
        ctx.fillRect(width / 2 + x * cellSize, height / 2 + (y * cellSize), cellSize, -cellSize)
      }
    }
  }
}

render()
state.setLayer("shadow", new Layer())
shadowcast(playerX, playerY, -1, 0)

document.addEventListener("keydown", (event) => {
  const key = event.key
  let deltaX = 0
  let deltaY = 0

  if (key === "w") deltaY = -1
  if (key === "s") deltaY = 1
  if (key === "a") deltaX = -1
  if (key === "d") deltaX = 1

  const a = state.getLayer("environment").get(playerX + deltaX, playerY + deltaY)
  if (a === "#") {
    return
  }

  playerX += deltaX
  playerY += deltaY

  viewportOffsetX = Math.min(Math.max( -maxViewportOffsetX, viewportOffsetX + deltaX ), maxViewportOffsetX)
  viewportOffsetY = Math.min(Math.max( -maxViewportOffsetY, viewportOffsetY + deltaY ), maxViewportOffsetY)


  if (deltaX != 0 || deltaY != 0) {
    render()
    state.setLayer("shadow", new Layer())
    shadowcast(playerX, playerY, -1, 0)
  }


})