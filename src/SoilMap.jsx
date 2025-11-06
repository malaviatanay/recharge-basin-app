import React, { useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, Popup } from "react-leaflet";
import L from "leaflet";
import soilRates from "./soilRates.json";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function LocationMarker({ onSelect }) {
  const [position, setPosition] = useState(null);

  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onSelect(e.latlng);
    },
  });

  return position ? (
    <Marker position={position} icon={markerIcon}>
      <Popup>
        Latitude: {position.lat.toFixed(4)}, Longitude: {position.lng.toFixed(4)}
      </Popup>
    </Marker>
  ) : null;
}

export default function SoilMap({ onSoilSelect }) {
  const [clicked, setClicked] = useState(null);

  const handleSelect = (latlng) => {
    setClicked(latlng);

    // simple demo rule
    const soil =
      latlng.lat > 37 ? soilRates[0] : latlng.lat > 35 ? soilRates[1] : soilRates[3];
    onSoilSelect(soil);
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm mt-5 hover:shadow-md transition-shadow duration-200">
      <h3 className="mb-2 text-lg font-semibold">Select Location on Map</h3>
      <p className="mb-3 text-sm text-gray-600">
        Click anywhere in California to mark your field. The app will suggest a typical soil type
        and update the infiltration rate automatically.
      </p>

      {/* Map container wrapper with fixed height */}
      <div className="relative w-full overflow-hidden rounded-xl border border-gray-300">
        <MapContainer
          center={[36.5, -119.5]}
          zoom={7}
          scrollWheelZoom={false}
          className="h-[300px] w-full z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker onSelect={handleSelect} />
        </MapContainer>
      </div>

      {clicked && (
        <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
          <p>
             <strong>Lat:</strong> {clicked.lat.toFixed(4)} &nbsp; 
            <strong>Lng:</strong> {clicked.lng.toFixed(4)}
          </p>
          <p className="mt-1">
             Suggested soil type applied based on location.
          </p>
        </div>
      )}
    </section>
  );
}
