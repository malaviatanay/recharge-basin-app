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
                color: "#1d4ed8", // nice blue color
                weight: 3,
                opacity: 0.8,
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
        const layer = e.layer;
        drawnItems.clearLayers();
        drawnItems.addLayer(layer);

        const bounds = layer.getBounds();
        const coords = [
          [bounds.getNorth(), bounds.getWest()],
          [bounds.getNorth(), bounds.getEast()],
          [bounds.getSouth(), bounds.getEast()],
          [bounds.getSouth(), bounds.getWest()],
          [bounds.getNorth(), bounds.getWest()],
        ];

        // ✅ Slightly enlarge the area for USDA to ensure we get data
        const latExpand = 0.002; // roughly ~200m
        const lngExpand = 0.002;
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
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <MapContainer
        center={[36.75, -119.75]}
        zoom={13}
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
