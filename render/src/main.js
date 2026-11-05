import { createStage } from './stage.js';
import { createOverlay } from './overlay.js';

window.milo = {
  async load(episode) {
    await Promise.all(['500', '700', '800'].map((w) => document.fonts.load(`${w} 40px Inter`)));
    await document.fonts.ready;
    const stage = createStage(episode, document.getElementById('c'));
    const overlay = createOverlay(document.getElementById('stage'), episode);
    window.milo._stage = stage; window.milo._overlay = overlay;
    window.milo.duration = overlay.total;
    return overlay.total;
  },
  renderAt(t) {
    const info = window.milo._stage.renderAt(t);
    window.milo._overlay.update(t);
    return info.index;
  }
};
