(function() {
  function RunDemo() {
    let canvas = document.querySelector('canvas')
    paper.setup(canvas)
    paper.view.center = [0, 0]

    // simple polygon
    let r = new paper.Path.Rectangle({ point: [-600, -300], size: [80, 80], fillColor: '#bf5b5b', strokeColor: 'black' })
    r.offset(10)
    r.bringToFront()
    r.offset(-10).offset(-10).offset(-10)

    // simple polygon
    let s = new paper.Path.Star({ center: [-400, -260], points: 12, radius1: 40, radius2: 30, fillColor: '#ea9a64', strokeColor: 'black' })
    s.offset(10)
    s.bringToFront()
    s.offset(-10).offset(-10)

    // smooth
    let s2 = new paper.Path.Star({ center: [-250, -260], points: 7, radius1: 40, radius2: 30, fillColor: '#efd158', strokeColor: 'black' })
    s2.smooth()
    s2.offset(10)
    s2.bringToFront()
    s2.offset(-10).offset(-10)

    // complex
    let c1 = new paper.Path.Circle({ center: [-120, -260], radius: 40, fillColor: '#a5c15d', strokeColor: 'black' })
    let c2 = new paper.Path.Circle({ center: [-50, -260], radius: 40, fillColor: '#a5c15d', strokeColor: 'black' })
    let c = c1.unite(c2, { insert: true })
    c.offset(10)
    c.bringToFront()
    c.offset(-10).offset(-10).offset(-10)
  }
  window.onload = RunDemo
})()