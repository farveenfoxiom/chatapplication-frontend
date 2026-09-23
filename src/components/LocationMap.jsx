import { useEffect, useState } from "react";
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

function LocationMap({
  latitude,
  longitude,
  isLive,
  expiresAt,
  isMine,
  onStopSharing,
  time,
}) {
  const [timeLeftLabel, setTimeLeftLabel] = useState("");
  const [locallyExpired, setLocallyExpired] = useState(false);

  useEffect(() => {
    setLocallyExpired(false);
  }, [expiresAt]);

  useEffect(() => {
    if (!isLive || !expiresAt) {
      setTimeLeftLabel("");
      return;
    }

    const update = () => {
      const msLeft = new Date(expiresAt).getTime() - Date.now();

      if (msLeft <= 0) {
        setTimeLeftLabel("");
        setLocallyExpired(true);
        return;
      }

      const totalMinutes = Math.ceil(msLeft / 60000);

      if (totalMinutes >= 60) {
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        setTimeLeftLabel(
          minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`
        );
      } else {
        setTimeLeftLabel(`${totalMinutes}m left`);
      }
    };

    update();
    const interval = setInterval(update, 10000);

    return () => clearInterval(interval);
  }, [isLive, expiresAt]);

  const effectivelyLive = isLive && !locallyExpired;

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
            attribution="&copy; OpenStreetMap contributors"
          />
          <Marker position={[latitude, longitude]} icon={defaultIcon} />
        </MapContainer>

        {effectivelyLive && (
          <span className="absolute top-2 left-2 bg-green-600 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 z-[1000]">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Live
          </span>
        )}
        {time && (
          <span className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full z-[1000]">
            {time}
          </span>
        )}
      </div>

      <div className="bg-white px-3 py-2">
        <p className="text-sm font-medium text-gray-800">
          {effectivelyLive ? "Live location" : "Location"}
        </p>

        {effectivelyLive && timeLeftLabel && (
          <p className="text-xs text-gray-500">{timeLeftLabel}</p>
        )}

        {!effectivelyLive && (
          <p className="text-xs text-blue-500">Open in Google Maps</p>
        )}

        {effectivelyLive && isMine && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStopSharing?.();
            }}
            className="relative z-[1000] mt-1 text-xs text-red-500 font-medium hover:underline"
          >
            Stop sharing
          </button>
        )}
      </div>
    </div>
  );
}

export default LocationMap;