import paper from 'paper';
import ExtendPaperJs, { analyze, offset, offsetStroke } from './index';

ExtendPaperJs(paper);

const api = {
  offset,
  offsetStroke,
  analyze,
};

declare global {
  interface Window {
    PaperOffset: typeof api;
    paperjsOffset: typeof api;
  }
}

window.PaperOffset = api;
window.paperjsOffset = api;
