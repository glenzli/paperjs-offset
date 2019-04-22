(function() {
  function RunDemo() {
    let canvas = document.querySelector('canvas')
    paper.setup(canvas)
    paper.view.center = [0, 0]

    // simple polygon
    let r = new paper.Path.Rectangle({ point: [-500, -300], size: [80, 80], fillColor: '#bf5b5b', strokeColor: 'black' })
    r.offset(10)
    r.bringToFront()
    r.offset(-10).offset(-10).offset(-10)

    // simple polygon + bevel
    let r1 = new paper.Path.Rectangle({ point: [-500, -150], size: [60, 60], fillColor: '#bf5b5b', strokeColor: 'black' })
    r1.offset(20, { mode: 'bevel' })
    r1.bringToFront()

    // simple polygon + round
    let r2 = new paper.Path.Rectangle({ point: [-300, -150], size: [60, 60], fillColor: '#bf5b5b', strokeColor: 'black' })
    r2.offset(20, { mode: 'round' })
    r2.bringToFront()

    // simple polygon
    let s = new paper.Path.Star({ center: [-300, -260], points: 12, radius1: 40, radius2: 30, fillColor: '#ea9a64', strokeColor: 'black' })
    s.offset(10)
    s.bringToFront()
    s.offset(-10).offset(-10)

    // smooth
    let s2 = new paper.Path.Star({ center: [-150, -260], points: 7, radius1: 40, radius2: 30, fillColor: '#efd158', strokeColor: 'black' })
    s2.smooth()
    s2.offset(10)
    s2.bringToFront()
    s2.offset(-10).offset(-10)

    // complex
    let c1 = new paper.Path.Circle({ center: [-20, -260], radius: 40, fillColor: '#a5c15d', strokeColor: 'black' })
    let c2 = new paper.Path.Circle({ center: [50, -260], radius: 40, fillColor: '#a5c15d', strokeColor: 'black' })
    let c = c1.unite(c2, { insert: true })
    c.offset(10)
    c.bringToFront()
    c.offset(-10).offset(-10).offset(-10)

    let c3 = new paper.Path.Circle({ center: [180, -260], radius: 40, fillColor: '#75aaad', strokeColor: 'black' })
    let c4 = new paper.Path.Circle({ center: [230, -260], radius: 40, fillColor: '#75aaad', strokeColor: 'black' })
    let c5 = new paper.Path.Circle({ center: [205, -200], radius: 40, fillColor: '#75aaad', strokeColor: 'black' })
    let cc = c3.unite(c4, { insert: true }).unite(c5, { insert: true })
    cc.offset(10)
    cc.bringToFront()
    cc.offset(-10).offset(-10).offset(-10).offset(-5)

    // complex+
    let c6 = new paper.Path.Circle({ center: [380, -260], radius: 40, fillColor: '#9c68c1', strokeColor: 'black' })
    let c7 = new paper.Path.Circle({ center: [430, -260], radius: 40, fillColor: '#9c68c1', strokeColor: 'black' })
    let c8 = new paper.Path.Circle({ center: [405, -200], radius: 40, fillColor: '#9c68c1', strokeColor: 'black' })
    let ccc = c6.unite(c7, { insert: true }).unite(c8, { insert: true })
    ccc.smooth()
    ccc.offset(10)
    ccc.bringToFront()
    ccc.offset(-10).offset(-10).offset(-10)
  }
  window.onload = RunDemo
})()