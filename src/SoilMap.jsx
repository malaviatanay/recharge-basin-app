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

// ✅ Visual fixes
const leafletFixStyles = `
  .leaflet-container { z-index: 20 !important; }
  .leaflet-interactive {
    stroke: #2563eb !important;
    stroke-width: 3 !important;
    fill: #60a5fa !important;
    fill-opacity: 0.25 !important;
  }
`;

export default function SoilMap({ onAreaSelect }) {
  function DrawHandler({ onAreaSelect }) {
    const map = useMap();

    useEffect(() => {
      const drawnItems = new L.FeatureGroup();
      map.addLayer(drawnItems);

      // ✅ Toolbar only added once
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
        map._drawControlAdded = true;
      }

      // ✅ When a rectangle is drawn
      const handleCreated = (e) => {
        drawnItems.clearLayers();
        const layer = e.layer;
        drawnItems.addLayer(layer);

        const b = layer.getBounds();
        const coords = [
          [b.getNorth(), b.getWest()],
          [b.getNorth(), b.getEast()],
          [b.getSouth(), b.getEast()],
          [b.getSouth(), b.getWest()],
          [b.getNorth(), b.getWest()],
        ];

        onAreaSelect(coords);
      };

      map.on(L.Draw.Event.CREATED, handleCreated);
      return () => map.off(L.Draw.Event.CREATED, handleCreated);
    }, [map, onAreaSelect]);

    return null;
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden relative">
      <style>{leafletFixStyles}</style>
      <MapContainer
        center={[36.75, -119.75]}
        zoom={12}
        style={{ height: "400px", width: "100%" }}
        scrollWheelZoom={true}
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
