import L from "leaflet";
import "leaflet-draw";

// ✅ Point Leaflet Draw to the correct sprite image
import spritesheet from "leaflet-draw/dist/images/spritesheet.png";
import spritesheet2x from "leaflet-draw/dist/images/spritesheet-2x.png";
import spritesheetSVG from "leaflet-draw/dist/images/spritesheet.svg";

if (L.Control.Draw) {
  L.drawLocal.draw.toolbar.buttons = {
    polygon: "Draw a polygon",
    rectangle: "Draw a rectangle",
    circle: "Draw a circle",
    marker: "Place a marker",
  };

  const iconPaths = {
    backgroundImage: `url(${spritesheet})`,
    backgroundSize: "auto",
  };

  const css = `
    .leaflet-draw-toolbar a {
      background-image: url(${spritesheet});
      background-repeat: no-repeat;
      background-size: auto;
    }
    @media only screen and (-webkit-min-device-pixel-ratio: 2),
      only screen and (min--moz-device-pixel-ratio: 2),
      only screen and (-o-min-device-pixel-ratio: 2/1),
      only screen and (min-device-pixel-ratio: 2),
      only screen and (min-resolution: 192dpi),
      only screen and (min-resolution: 2dppx) {
        .leaflet-draw-toolbar a {
          background-image: url(${spritesheet2x});
          background-size: auto;
        }
      }
  `;
  const styleTag = document.createElement("style");
  styleTag.innerHTML = css;
  document.head.appendChild(styleTag);
}

export default L;
