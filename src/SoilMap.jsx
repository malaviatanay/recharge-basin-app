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

// Fix styles so shapes stay visible
const leafletFixStyles = `
  .leaflet-container { z-index: 20 !important; }
  .leaflet-draw-toolbar a {
    background: white !important;
    border: 1px solid #ccc !important;
  }
  .leaflet-interactive {
    stroke: #2563eb !important;
    stroke-width: 3 !important;
    fill: #60a5fa !important;
    fill-opacity: .25 !important;
  }
`;

export default function SoilMap({ onAreaSelect }) {
  function DrawHandler({ onAreaSelect }) {
    const map = useMap();

    useEffect(() => {
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      // only add toolbar once
      if (!map._drawControlAdded) {
        const drawControl = new L.Control.Draw({
          position: "topright",
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
            },
          },
          edit: { featureGroup: drawnItems, remove: true },
        });
        map.addControl(drawControl);
        map._drawControlAdded = true; // mark as added
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
      <style>{leafletFixStyles}</style>
      <MapContainer
        center={[36.75, -119.75]}
        zoom={13}
        style={{ height: "400px", width: "100%" }}
        scrollWheelZoom
        whenReady={(map) => {
          // ensure we only init draw once on mount
          map.target._drawControlAdded = false;
        }}
      >
        <TileLayer
          attribution='&copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FeatureGroup>
          <DrawHandler onAreaSelect={onAreaSelect} />
        </FeatureGroup>
      </MapContainer>
    </div>
  );
}
