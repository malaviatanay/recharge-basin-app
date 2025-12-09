import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

// ✅ Base visual styles
const leafletFixStyles = `
  .leaflet-container { z-index: 20 !important; }
  .leaflet-interactive {
    stroke: #2563eb !important;
    stroke-width: 3 !important;
    fill: #60a5fa !important;
    fill-opacity: 0.25 !important;
  }
`;

// ✅ Inline SVG icons for toolbar
const toolbarIconFix = `
  .leaflet-draw-toolbar a {
    background-color: #ffffff !important;
    border: 1px solid #ccc !important;
    background-size: 16px 16px !important;
    background-repeat: no-repeat !important;
    background-position: center !important;
    width: 30px !important;
    height: 30px !important;
  }
  /* Rectangle icon */
  .leaflet-draw-toolbar a.leaflet-draw-draw-rectangle {
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%232563eb' stroke-width='2' width='16' height='16'><rect x='2' y='2' width='12' height='12' rx='1' ry='1'/></svg>");
  }
  /* Edit icon */
  .leaflet-draw-toolbar a.leaflet-draw-edit-edit {
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%232563eb' stroke-width='2' width='16' height='16'><path d='M3 11l8-8 2 2-8 8H3v-2z'/></svg>");
  }
  /* Delete icon */
  .leaflet-draw-toolbar a.leaflet-draw-edit-remove {
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%23ef4444' stroke-width='2' width='16' height='16'><line x1='4' y1='4' x2='12' y2='12'/><line x1='12' y1='4' x2='4' y2='12'/></svg>");
  }
`;

export default function SoilMap({ onAreaSelect }) {
  function DrawHandler({ onAreaSelect }) {
    const map = useMap();

    useEffect(() => {
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      if (!map._drawControlAdded) {
        const drawControl = new L.Control.Draw({
          position: "topleft",
          draw: {
            polygon: false,
            polyline: false,
            circle: false,
            marker: false,
            circlemarker: false,
            rectangle: {
              shapeOptions: {
                color: "#2563eb",
                weight: 3,
                opacity: 1,
                fillOpacity: 0.25,
              },
              showArea: true,
              metric: false,
            },
          },
          edit: {
            featureGroup: drawnItems,
            remove: true,
          },
        });
        map.addControl(drawControl);
        map._drawControlAdded = true;
      }

      const handleCreated = (e) => {
        drawnItems.clearLayers();
        const layer = e.layer;
        drawnItems.addLayer(layer);

        const b = layer.getBounds();
        const north = b.getNorth();
        const south = b.getSouth();
        const east = b.getEast();
        const west = b.getWest();

        const coords = [
          [north, west],
          [north, east],
          [south, east],
          [south, west],
          [north, west],
        ];

        console.log("🗺️ Rectangle coordinates:", coords);
        onAreaSelect(coords);
      };

      map.on(L.Draw.Event.CREATED, handleCreated);

      return () => {
        map.off(L.Draw.Event.CREATED, handleCreated);
      };
    }, [map, onAreaSelect]);

    return null;
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden relative">
      <style>{leafletFixStyles + toolbarIconFix}</style>
      <MapContainer
        center={[36.75, -119.75]}
        zoom={13}
        style={{ height: "400px", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FeatureGroup>
          <DrawHandler onAreaSelect={onAreaSelect} />
        </FeatureGroup>
      </MapContainer>
    </div>
  );
}