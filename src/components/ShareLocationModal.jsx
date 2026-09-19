import { X } from "lucide-react";

const DURATIONS = [
  { label: "Share for 15 minutes", minutes: 15 },
  { label: "Share for 1 hour", minutes: 60 },
  { label: "Share for 8 hours", minutes: 480 },
];

function ShareLocationModal({ onSelect, onClose }) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Share location
          </h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-2">
          <button
            onClick={() => onSelect(null)}
            className="w-full rounded-xl px-4 py-3 text-left text-gray-700 font-medium hover:bg-gray-100 transition"
          >
            Send your current location
          </button>

          <div className="h-px bg-gray-100 my-2" />

          {DURATIONS.map((d) => (
            <button
              key={d.minutes}
              onClick={() => onSelect(d.minutes)}
              className="w-full rounded-xl px-4 py-3 text-left text-gray-700 font-medium hover:bg-gray-100 transition"
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShareLocationModal;