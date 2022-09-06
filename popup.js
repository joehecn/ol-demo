
import Overlay from 'ol/Overlay';

/**
 * Elements that make up the popup.
 */
const container = document.getElementById('popup');
const content = document.getElementById('popup-content');
// const closer = document.getElementById('popup-closer');

/**
 * Create an overlay to anchor the popup to the map.
 */
export const overlay = new Overlay({
  element: container,
  autoPan: {
    animation: {
      duration: 250,
    },
  },
});

export const show = (coordinate, text) => {
  content.innerHTML = text;
  overlay.setPosition(coordinate);
}

export const hide = () => {
  overlay.setPosition(undefined);
  // closer.blur();
  return false;
}

/**
 * Add a click handler to hide the popup.
 * @return {boolean} Don't follow the href.
 */
// closer.onclick = function () {
//   hide()
// }
