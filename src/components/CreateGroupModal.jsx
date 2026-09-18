import { useEffect, useState } from "react";
import { X, Users, Check, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createGroup } from "../services/groupService";
import { searchUsers } from "../services/userService";

const API_BASE_URL = "http://localhost:5000";

// Drop this into Home.jsx (or wherever your 1:1 contact list already
// lives). `users` is the default suggested list shown before the person
// types anything (e.g. your existing chats) — once they type, this
// component calls the real /users/search endpoint instead.
//
// Usage:
//   const [showCreateGroup, setShowCreateGroup] = useState(false);
//   <button onClick={() => setShowCreateGroup(true)}>New Group</button>
//   {showCreateGroup && (
//     <CreateGroupModal
//       users={contacts}          // default suggestions (e.g. recent chats)
//       token={token}
//       onClose={() => setShowCreateGroup(false)}
//     />
//   )}
function CreateGroupModal({ users = [], token, onClose }) {
  const navigate = useNavigate();

  const [groupName, setGroupName] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]); // [{_id, name, profileImage}]
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Debounced search against the real endpoint, same one SearchUsers.jsx
  // uses. Clearing the box falls back to the default `users` suggestions
  // instead of calling the API with an empty query.
  useEffect(() => {
    if (memberSearch.trim() === "") {
      setSearchResults(null);
      setSearchError("");
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setSearching(true);
        setSearchError("");
        const data = await searchUsers(memberSearch, token, 0, 20);
        setSearchResults(data.users);
      } catch (err) {
        console.error("Search users error:", err);
        setSearchError(
          err.response?.data?.message || "Failed to search users"
        );
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [memberSearch, token]);

  const displayedUsers = memberSearch.trim() === "" ? users : searchResults || [];

  const isSelected = (userId) =>
    selectedMembers.some((member) => member._id === userId);

  const toggleMember = (user) => {
    setSelectedMembers((prev) =>
      prev.some((member) => member._id === user._id)
        ? prev.filter((member) => member._id !== user._id)
        : [...prev, user]
    );
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }

    if (selectedMembers.length < 2) {
      setError("Pick at least 2 members for the group");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const memberIds = selectedMembers.map((member) => member._id);
      const data = await createGroup(groupName.trim(), memberIds, token);

      onClose();
      navigate(`/group/${data.group._id}`);
    } catch (err) {
      console.error("Create group error:", err);
      setError(err.response?.data?.message || "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white shadow-xl flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">New Group</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 border-b border-gray-100">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Group name
          </label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g. Weekend Trip"
            className="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {selectedMembers.length > 0 && (
          <div className="px-5 pt-4 flex flex-wrap gap-2">
            {selectedMembers.map((member) => (
              <span
                key={member._id}
                className="flex items-center gap-1.5 bg-green-50 text-green-700 text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-full"
              >
                {member.name}
                <button
                  type="button"
                  onClick={() => toggleMember(member)}
                  className="w-4 h-4 rounded-full hover:bg-green-200 flex items-center justify-center"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Add members ({selectedMembers.length} selected)
          </p>

          <div className="relative mb-3">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search by name, username or email"
              className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {searching && (
            <p className="text-sm text-gray-400 text-center py-2">
              Searching...
            </p>
          )}

          {!searching && searchError && (
            <p className="text-sm text-red-500 text-center py-2">
              {searchError}
            </p>
          )}

          {!searching &&
            !searchError &&
            memberSearch.trim() !== "" &&
            displayedUsers.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-2">
                No users found
              </p>
            )}

          {!searching && memberSearch.trim() === "" && displayedUsers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">
              Start typing to search for people to add.
            </p>
          )}

          {!searching && displayedUsers.length > 0 && (
            <div className="space-y-1">
              {displayedUsers.map((user) => {
                const selected = isSelected(user._id);

                return (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() => toggleMember(user)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition ${
                      selected ? "bg-green-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden shrink-0">
                      {user.profileImage ? (
                        <img
                          src={`${API_BASE_URL}${user.profileImage}`}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <Users size={18} className="text-green-600" />
                      )}
                    </div>

                    <span className="flex-1 text-left min-w-0">
                      <span className="block text-sm font-medium text-gray-800 truncate">
                        {user.name}
                      </span>
                      {user.username && (
                        <span className="block text-xs text-gray-500 truncate">
                          @{user.username}
                        </span>
                      )}
                    </span>

                    {selected && (
                      <span className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                        <Check size={14} className="text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <p className="px-5 text-sm text-red-500 text-center">{error}</p>
        )}

        <div className="p-5 border-t border-gray-100">
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="w-full py-3 rounded-xl bg-green-500 text-white font-medium hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? "Creating..." : "Create Group"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateGroupModal;