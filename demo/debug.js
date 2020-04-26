(function() {
  function DebugCase() {
    let canvas = document.querySelector('canvas');
    paper.setup(canvas);
    paper.view.center = [0, 0];

    const c3 = new paper.Path.Circle({ center: [180, 260], radius: 50, strokeColor: 'black' });
    const c4 = new paper.Path.Circle({ center: [230, 260], radius: 40, strokeColor: 'black' });
    const c5 = new paper.Path.Circle({ center: [205, 200], radius: 40, strokeColor: 'black' });
    const cc1 = c3.unite(c4, { insert: true });
    const cc = cc1.unite(c5, { insert: true });
    c3.remove();
    c4.remove();
    c5.remove();
    cc1.remove();
    cc.bringToFront();
    cc.translate(new paper.Point(-100, -100));

    PaperOffset.offset(cc, 24);

    const c = new paper.Path({pathData: "M4,11L5,13", strokeColor: 'rgba(156, 104, 193, 0.5)', strokeWidth: 4});
    PaperOffset.offsetStroke(c, 10, {cap: "round", join: "round"});
  }

  window.onload = DebugCase;
})();