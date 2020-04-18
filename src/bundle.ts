import paper from 'paper';
import ExtendPaperJs, { PaperOffset } from './index';

ExtendPaperJs(paper);

declare global {
  interface Window {
    PaperOffset: {
      offset: typeof PaperOffset.offset;
      offsetStroke: typeof PaperOffset.offsetStroke;
    }
  }
}

window.PaperOffset = {
  offset: PaperOffset.offset,
  offsetStroke: PaperOffset.offsetStroke,
};
