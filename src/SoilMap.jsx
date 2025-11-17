import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  FeatureGroup,
  useMap,
} from "react-leaflet";
import L from "./fixLeafletIcons";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";

// ✅ Fix: Make sure Leaflet styles stay on top of Tailwind
const leafletFixStyles = `
  .leaflet-container {
    z-index: 10 !important;
  }
  .leaflet-draw-toolbar a {
    background: white !important;
    border: 1px solid #ccc !important;
  }
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
                opacity: 0.9,
                fillOpacity: 0.2,
              },
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

        const bounds = layer.getBounds();
        const coords = [
          [bounds.getNorth(), bounds.getWest()],
          [bounds.getNorth(), bounds.getEast()],
          [bounds.getSouth(), bounds.getEast()],
          [bounds.getSouth(), bounds.getWest()],
          [bounds.getNorth(), bounds.getWest()],
        ];

        // Slightly expand for USDA reliability
        const latExpand = 0.005;
        const lngExpand = 0.005;
        const expandedCoords = [
          [bounds.getNorth() + latExpand, bounds.getWest() - lngExpand],
          [bounds.getNorth() + latExpand, bounds.getEast() + lngExpand],
          [bounds.getSouth() - latExpand, bounds.getEast() + lngExpand],
          [bounds.getSouth() - latExpand, bounds.getWest() - lngExpand],
          [bounds.getNorth() + latExpand, bounds.getWest() - lngExpand],
        ];

        onAreaSelect(expandedCoords);
      };

      map.on(L.Draw.Event.CREATED, handleCreated);
      return () => map.off(L.Draw.Event.CREATED, handleCreated);
    }, [map, onAreaSelect]);

    return null;
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden relative">
      {/* ✅ Inline styles to fix overlay visibility */}
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
