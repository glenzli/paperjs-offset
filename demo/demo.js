(function() {
  function RunDemo() {
    let canvas = document.querySelector('canvas')
    paper.setup(canvas)
    paper.view.center = [0, 0]

    // simple polygon
    let r = new paper.Path.Rectangle({ point: [-500, -300], size: [80, 80], fillColor: 'rgb(191, 91, 91, 0.5)', strokeColor: 'black' })
    r.offset(10)
    r.bringToFront()
    r.offset(-10).offset(-10).offset(-10)

    // simple polygon + bevel
    let r11 = new paper.Path.Rectangle({ point: [-500, -150], size: [60, 60], fillColor: 'rgb(191, 91, 91, 0.5)', strokeColor: 'black' })
    let r12 = r11.offset(-10, { insert: false })
    let r1 = r11.subtract(r12, { insert: true })
    r11.remove()
    r1.offset(15, { join: 'bevel' })
    r1.bringToFront()

    // simple polygon + round
    let r21 = new paper.Path.Rectangle({ point: [-350, -150], size: [60, 60], fillColor: 'rgb(191, 91, 91, 0.5)', strokeColor: 'black' })
    let r22 = r21.offset(-10, { insert: false })
    let r2 = r21.subtract(r22, { insert: true })
    r21.remove()
    r2.offset(15, { join: 'round' })
    r2.bringToFront()

    // simple polygon
    let s = new paper.Path.Star({ center: [-300, -260], points: 12, radius1: 40, radius2: 30, fillColor: 'rgba(234, 154, 100, 0.5)', strokeColor: 'black' })
    s.offset(10)
    s.bringToFront()
    s.offset(-10).offset(-10)

    // smooth
    let s2 = new paper.Path.Star({ center: [-150, -260], points: 7, radius1: 40, radius2: 30, fillColor: 'rgba(239, 209, 88, 0.5)', strokeColor: 'black' })
    s2.smooth()
    s2.offset(10)
    s2.bringToFront()
    s2.offset(-10).offset(-10)

    // complex
    let c1 = new paper.Path.Circle({ center: [-20, -260], radius: 40, fillColor: 'rgba(165, 193, 93, 0.5)', strokeColor: 'black' })
    let c2 = new paper.Path.Circle({ center: [50, -260], radius: 40, fillColor: 'rgba(165, 193, 93, 0.5)', strokeColor: 'black' })
    let c = c1.unite(c2, { insert: true })
    c1.remove()
    c2.remove()
    c.offset(10)
    c.bringToFront()
    c.offset(-10).offset(-10).offset(-10)

    let c3 = new paper.Path.Circle({ center: [180, -260], radius: 40, fillColor: 'rgba(117, 170, 173, 0.5)', strokeColor: 'black' })
    let c4 = new paper.Path.Circle({ center: [230, -260], radius: 40, fillColor: 'rgba(117, 170, 173, 0.5)', strokeColor: 'black' })
    let c5 = new paper.Path.Circle({ center: [205, -200], radius: 40, fillColor: 'rgba(117, 170, 173, 0.5)', strokeColor: 'black' })
    let cc1 = c3.unite(c4, { insert: true })
    let cc = cc1.unite(c5, { insert: true })
    c3.remove()
    c4.remove()
    c5.remove()
    cc1.remove()
    cc.offset(10)
    cc.bringToFront()
    cc.offset(-10).offset(-10).offset(-10).offset(-5)

    // complex+
    let c6 = new paper.Path.Circle({ center: [380, -260], radius: 40, fillColor: 'rgba(156, 104, 193, 0.5)', strokeColor: 'black' })
    let c7 = new paper.Path.Circle({ center: [430, -260], radius: 40, fillColor: 'rgba(156, 104, 193, 0.5)', strokeColor: 'black' })
    let c8 = new paper.Path.Circle({ center: [405, -200], radius: 40, fillColor: 'rgba(156, 104, 193, 0.5)', strokeColor: 'black' })
    let ccc1 = c6.unite(c7, { insert: true })
    let ccc = ccc1.unite(c8, { insert: true })
    c6.remove()
    c7.remove()
    c8.remove()
    ccc1.remove()
    ccc.smooth()
    ccc.offset(10)
    ccc.bringToFront()
    ccc.offset(-10).offset(-10)
    ccc.offset(-30).offset(-5)

    // stroke
    let rs = new paper.Path.Rectangle({ point: [-200, -150], size: [80, 80], fillColor: null, strokeColor: 'rgb(191, 91, 91, 0.5)' })
    rs.offsetStroke(10)
    rs.bringToFront()

    // stroke
    let st1 = new paper.Path.Line({ from: [-50, -100], to: [0, -100], strokeColor: 'rgba(156, 104, 193, 0.5)', strokeWidth: 3 })
    st1.offsetStroke(20, { cap: 'round' })
    st1.bringToFront()

    // stroke complex
    let cs = c.clone()
    cs.strokeColor = cs.fillColor
    cs.strokeWidth = 3
    cs.fillColor = null
    cs.position = [150, -50]
    cs.closed = false
    cs.offsetStroke(20)
    cs.bringToFront()
    let cs2 = cs.clone()
    cs2.position = [400, -50]
    cs2.strokeColor = 'rgba(117, 170, 173, 0.5)'
    cs2.offsetStroke(25, { cap: 'round' })
    cs2.bringToFront()

    // edge cases
    let ec1 = new paper.Path({ pathData: 'M466,467c0,0 -105,-235 0,0c-376.816,-119.63846 -469.06596,-146.09389 -650.61329,-266.59735c-282.68388,-230.49081 300.86045,-10.26825 452.77726,121.52815z', fillColor: 'rgba(156, 104, 193, 0.5)' })
    ec1.translate(-450, -250)
    ec1.scale(0.4)
    ec1.offset(10)
    ec1.offset(-10).offset(-10).offset(-10)

    let ec2 = new paper.Path({ pathData: 'M466,467c-65,-34 136,64 0,0c-391,-270 62,-670 62,-670l-463,370z', strokeColor: 'rgba(239, 209, 88, 0.5)', strokeWidth: 3 })
    ec2.scale(0.4)
    ec2.translate(-350, 20)
    ec2.offsetStroke(10)

    let ec3 = new paper.Path({ pathData: 'M466,467c-65,-34 136,64 0,0c-391,-270 520,-471 522,-137c-214,-144 -1489,123 -923,-163z', fillColor: 'rgb(191, 91, 91, 0.5)' })
    ec3.scale(0.4)
    ec3.translate(-100, -150)
    ec3.offset(-10)
  }
  window.onload = RunDemo
})()