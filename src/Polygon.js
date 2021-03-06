/** @module Polygon */

import { SHOW_OUTLINES, TRACK_LENGTH } from './config.js'
/** 
 * @typedef Coordinates
 * @type {[number, number]}
 */

/**
 * Базовый многоугольник
 * @class
 * @alias module:Polygon
 */
export default class Polygon {
  /**
   * @param {{ scene: import("./Scene").default, color: string, speed: number, direction: number, x: number, y: number, vertices: Coordinates[] }}
   */
  constructor({ scene, color, speed, direction, x, y, vertices }) {

    /** @type {import("./Scene").default} Scene */
    this.scene = scene
    /** @type {number} speed */
    this.speed = speed
    /** 
     * @type {number} 
     * @private
     * */
    this._direction = direction
    /** @type {number} */
    this.color = color
    /** @type {number} */
    this.x = x
    /** @type {number} */
    this.y = y
    /** @type {Coordinates[]} */
    this.deltaVertices = vertices || []
    
    /** @type {Coordinates[]} */
    this.track = []
  }

  /** Ширина полигона */
  get width() {
    return this.rigthBorder - this.leftBorder
  }
  
  /** Высота полигона */
  get height() {
    return this.bottomBorder - this.topBorder
  }
  
  /** Верхняя граница полигона */
  get topBorder() {
    return Math.min(...this.vertices.map(c => c[1]))
  }
  
  /** Правая граница полигона */
  get rigthBorder() {
    return Math.max(...this.vertices.map(c => c[0]))
  }
  
  /** Нижняя граница полигона */
  get bottomBorder() {
    return Math.max(...this.vertices.map(c => c[1]))
  }
  
  /** Левая граница полигона */
  get leftBorder() {
    return Math.min(...this.vertices.map(c => c[0]))
  }

  /** Направление движения */
  get direction () {
    return this._direction
  }

  set direction (value) {
    if (value < 0) this._direction = 360 + value
    else if (value > 360) {
      this._direction = value % 360
    } else {
      this._direction = value
    }
  }
  
  /** 
   * Координаты вершин многоугольника
   * @returns {Coordinates[]}
   */
  get vertices() {
    return this.deltaVertices.map(c => {
      return [
        c[0] + this.x,
        c[1] + this.y
      ]
    })
  }

  /** Контур объекта */
  get path () {
    const path = new Path2D()
    const vertices = this.vertices
    path.moveTo(...vertices[0])
    for (let i = vertices.length - 1; i >= 0; i--) {
      path.lineTo(...vertices[i])
    }

    return path
  }

  /**
   * Перемещает многоугольник в соответствии с текущим направлением и скоростью
   */
  move() {
    if (this.speed < 0 || this.direction === null) {
      this.render()
      return this
    }
    const horizontalSpeed = this.speed * Math.cos(this.direction * (Math.PI / 180))
    const verticalSpeed = this.speed * Math.sin(this.direction * (Math.PI / 180))
    this.x += horizontalSpeed
    this.y += verticalSpeed

    // Столкновение с левой границей сцены
    if (this.leftBorder <= 0) {
      this.x = this.x-this.leftBorder
      this.direction = 180 - this.direction
    }
    
    // Столкновение с правой границей сцены
    if (this.rigthBorder >= this.scene.width) {
      this.x = this.scene.width - (this.rigthBorder - this.x)
      this.direction = 180 - this.direction
    }

    // Столкновение с верхней границей сцены
    if (this.topBorder <= 0) {
      this.y = this.y - this.topBorder
      this.direction = 360 - this.direction
    }
    
    // Столкновение с нижней границей сцены
    if (this.bottomBorder >= this.scene.height) {
      this.y = this.scene.height - (this.bottomBorder - this.y)
      this.direction = 360 - this.direction
    }

    // Столкновение с другом объектом
    this.scene.factory.items.forEach(target => {

      if (target === this) {
        return
      }
      
    //   /** */
      let touchPoint = this.hasTouchPoint(target)

      // Пропускаем если нет точек соприкосновения
      if (!touchPoint) {
        return
      }

      
      // Смещаем в обратном направлении пока остаются точки соприкосновения
      while (touchPoint) {
        this.x -= horizontalSpeed / 2
        this.y -= verticalSpeed / 2
        touchPoint = this.hasTouchPoint(target)
      }

      // this.x = target.leftBorder
      // this.x - (this.rigthBorder - this.x)

      const oldDirection = this.direction

      if (this.x < target.leftBorder) {
        this.direction = 180 - this.direction
      }

      if (this.x > target.rigthBorder) {
        this.direction = 180 - this.direction
      }

      if (this.y < target.topBorder) {
        this.direction = 360 - this.direction
      }

      if (this.y > target.bottomBorder) {
        this.direction = 360 - this.direction
      }

      if (oldDirection === this.direction) {
        this.direction += 180
      }
      
    //   /** Коофициент соотношения скоростей */
    //   const coof = 1 / (this.speed + target.speed)
      
    //   // Изменяем направления при столкновении
    //   // this.direction = (90 + this.direction) / 2
    //   // if (this.speed > 0 && target.speed > 0) {
    //   //   this.direction = (this.direction + target.direction) / (coof * this.speed)
    //   //   target.direction = (this.direction + target.direction) / (coof * target.speed)
    //   // } else if (this.speed === 0) {
    //   //   this.direction = target.direction
    //   // } else {
    //   //   target.direction = this.direction
    //   // }

      // Изменяем скорость при столкновении
      if (target.constructor.name !== 'Let') {
        if (this.speed > target.speed) {
          this.speed--
          target.speed++
        } else if (this.speed != target.speed) {
          this.speed++
          target.speed--
        }
      }
    });

    // Сохраняем координаты для отрисовки пройденного пути
    if (TRACK_LENGTH > 0) {
      this.track.unshift([this.x, this.y])
      this.track.splice(TRACK_LENGTH, this.track.length)
    }

    this.render()
    return this
  }

  /**
   * Проверяет есть ли точки соприкосновения
   * @param {(Polygon | import("./Circle").default | import("./Let").default)} target
   * @returns {boolean}
   */
  hasTouchPoint(target) {
    if (target.constructor.name === 'Let') {
      return target.hasTouchPoint(this)
    }
    const target_path = target.path
    const vertices = this.vertices;
    for (let i = 0; i < vertices.length; i++) {
      const point = vertices[i];
      if (this.scene.ctx.isPointInPath(target_path, ...point, 'evenodd')) {
        return true
      }
    }

    return false
  }

  /** Рисует границы */
  renderOutline() {
    const outline = new Path2D()
    outline.rect(
      this.leftBorder,
      this.topBorder,
      this.width,
      this.height
    )
  
    const dot = new Path2D(outline)
    dot.rect(
      this.x,
      this.y,
      1,
      1
    )
    this.scene.ctx.stroke(dot)

    return this
  }

  /** Рисует след */
  renderTrack() {
    const track = new Path2D()
    track.moveTo(this.x, this.y)
    this.track.forEach(coordinates => track.lineTo(...coordinates))
    this.scene.ctx.stroke(track)
    return this
  }

  /** Рисует многоугольник */
  renderPolygon() {
    this.scene.ctx.fillStyle = this.color
    this.scene.ctx.fill(this.path)
    return this
  }

  /**
   * Рисует многоугольник, границы и след
   */
  render() {
    
    this.renderPolygon()

    if (SHOW_OUTLINES) {
      this.renderOutline()
    }

    if (this.track && this.track.length) {
      this.renderTrack()
    }

    return this
  }
}