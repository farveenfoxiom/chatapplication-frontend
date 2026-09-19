import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { X } from "lucide-react";

const defaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

function LocationPreviewModal({
  latitude,
  longitude,
  isLive,
  durationMinutes,
  onConfirm,
  onCancel,
  sending,
}) {
  return (
    <div
      className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/40 px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            {isLive ? "Share live location" : "Send location"}
          </h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <MapContainer
          center={[latitude, longitude]}
          zoom={15}
          scrollWheelZoom={false}
          dragging={false}
          zoomControl={false}
          style={{ height: "220px", width: "100%" }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <Marker position={[latitude, longitude]} icon={defaultIcon} />
        </MapContainer>

        <div className="p-4">
          <p className="text-sm text-gray-500 mb-4">
            {isLive
              ? `Your location will update live for ${
                  durationMinutes >= 60
                    ? `${durationMinutes / 60} hour${durationMinutes > 60 ? "s" : ""}`
                    : `${durationMinutes} minutes`
                }.`
              : "This is your current location."}
          </p>

          <div className="flex gap-2">
            <button
              onClick={onCancel}
              disabled={sending}
              className="flex-1 rounded-xl px-4 py-3 text-gray-600 font-medium bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={sending}
              className="flex-1 rounded-xl px-4 py-3 text-white font-medium bg-green-500 hover:bg-green-600 transition disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LocationPreviewModal;