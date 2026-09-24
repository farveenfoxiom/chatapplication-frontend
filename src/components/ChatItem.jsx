import { User, Trash2 } from "lucide-react";
import { API_BASE_URL, SOCKET_URL } from "../config";

import { getImageUrl } from "../utils/getImageUrl";

function ChatItem({ chat, onClick, onDelete }) {
  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(chat.id);
  };
  return (
    <div
      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-gray-100 transition group cursor-pointer"
      onClick={onClick}>
      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0 overflow-hidden">
        {chat.profileImage ? (
          <img
            src={getImageUrl(chat.profileImage)}
            alt={chat.name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <User
            size={22}
            className="text-green-600"
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-gray-900 truncate">
            {chat.name}
          </h3>
          <span className="text-xs text-gray-400 shrink-0">
            {chat.time}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-sm text-gray-500 truncate">
            {chat.message}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            {chat.unreadCount > 0 && (
              <span className="min-w-5 h-5 px-1.5 rounded-full bg-green-500 text-white text-xs font-semibold flex items-center justify-center">
                {chat.unreadCount > 99
                  ? "99+"
                  : chat.unreadCount}
              </span>
            )}
            <button
              type="button"
              onClick={handleDelete}
              className="hidden group-hover:flex w-8 h-8 items-center justify-center rounded-full hover:bg-red-100 text-gray-400 hover:text-red-500 transition"
              title="Delete chat">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatItem;