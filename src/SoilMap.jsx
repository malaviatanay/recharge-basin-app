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

      // ✅ Add draw controls (rectangle only)
      const drawControl = new L.Control.Draw({
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
        edit: {
          featureGroup: drawnItems,
          remove: true,
        },
      });

      map.addControl(drawControl);

      // ✅ Handle rectangle creation
      map.on(L.Draw.Event.CREATED, (e) => {
        drawnItems.clearLayers();
        drawnItems.addLayer(e.layer);

        const b = e.layer.getBounds();
        const north = b.getNorth();
        const south = b.getSouth();
        const east = b.getEast();
        const west = b.getWest();

        // ✅ Construct valid rectangular polygon
        const coords = [
          [north, west],
          [north, east],
          [south, east],
          [south, west],
          [north, west],
        ];

        console.log("🗺️ Rectangle coordinates:", coords);
        onAreaSelect(coords);
      });

      return () => {
        map.off(L.Draw.Event.CREATED);
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
