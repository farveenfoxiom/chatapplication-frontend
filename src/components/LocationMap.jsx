import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function LocationMap({ latitude, longitude, isLive }) {
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

  const openInGoogleMaps = () => {
    window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="relative rounded-2xl overflow-hidden w-64 md:w-72">
      <div
        className="absolute inset-0 z-[999] cursor-pointer"
        onClick={openInGoogleMaps}
        title="Open in Google Maps"
      />

      <div className="relative">
        <MapContainer
          center={[latitude, longitude]}
          zoom={15}
          scrollWheelZoom={false}
          dragging={false}
          zoomControl={false}
          style={{ height: "160px", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <Marker position={[latitude, longitude]} icon={defaultIcon} />
        </MapContainer>

        {isLive && (
          <span className="absolute top-2 left-2 bg-green-600 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Live
          </span>
        )}
      </div>

      <div className="bg-white px-3 py-2">
        <p className="text-sm font-medium text-gray-800">
          {isLive ? "Live location" : "Location"}
        </p>
        <p className="text-xs text-blue-500">Open in Google Maps</p>
      </div>
    </div>
  );
}

export default LocationMap;