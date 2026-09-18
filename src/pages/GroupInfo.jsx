import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Edit,
  LogOut,
  Plus,
  Search,
  Shield,
  ShieldOff,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";

import {
  addGroupMembers,
  getGroupById,
  updateGroup,
  updateGroupAdmin,
  removeGroupMember,
  leaveGroup,
} from "../services/groupService";
import { searchUsers } from "../services/userService";

const API_BASE_URL = "http://localhost:5000";

function getImageUrl(image) {
  if (!image) return "";
  if (image.startsWith("http")) return image;
  return `${API_BASE_URL}${image}`;
}

function GroupInfo() {
  const navigate = useNavigate();
  const { groupId } = useParams();

  const { token, user: currentUser } = useSelector(
    (state) => state.auth
  );

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddMembers, setShowAddMembers] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [addingMembers, setAddingMembers] = useState(false);

  const [showEditInfo, setShowEditInfo] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupBio, setGroupBio] = useState("");
  const [groupImage, setGroupImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [updatingGroup, setUpdatingGroup] = useState(false);

  const [actionLoading, setActionLoading] = useState("");

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        setLoading(true);
        setError("");

        const data = await getGroupById(groupId, token);
        setGroup(data.group);
      } catch (err) {
        console.error("Failed to load group:", err);
        setError(
          err.response?.data?.message ||
            "Failed to load group"
        );
      } finally {
        setLoading(false);
      }
    };

    if (groupId && token) {
      fetchGroup();
    }
  }, [groupId, token]);

  useEffect(() => {
    if (!showAddMembers || !memberSearch.trim() || !group) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setSearching(true);

        const data = await searchUsers(
          memberSearch,
          token,
          0,
          20
        );

        const existingMemberIds =
          group.members?.map(
            (member) =>
              (member._id || member).toString()
          ) || [];

        const filteredUsers = (data.users || []).filter(
          (user) =>
            !existingMemberIds.includes(
              user._id.toString()
            )
        );

        setSearchResults(filteredUsers);
      } catch (err) {
        console.error("Search users error:", err);
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [
    showAddMembers,
    memberSearch,
    token,
    group,
  ]);

  const currentUserId =
    currentUser?._id?.toString() ||
    currentUser?.id?.toString() ||
    currentUser?.userId?.toString();

    const isAdmin = Boolean(
    group?.admins?.some((admin) => {
        const adminId =
        admin?._id?.toString() ||
        admin?.id?.toString() ||
        admin?.userId?.toString() ||
        admin?.toString();

        return adminId === currentUserId;
    }) ||
    group?.createdBy?._id?.toString() === currentUserId ||
    group?.createdBy?.id?.toString() === currentUserId ||
    group?.createdBy?.userId?.toString() === currentUserId ||
    group?.createdBy?.toString() === currentUserId
    );
    console.log("Current User:",currentUser);
    console.log("Current User ID:",currentUserId);
    console.log("Group:",group);
    console.log("Group Admins:",group?.admins);
    console.log("Group Creator:",group?.createdBy);
    console.log("Is Admin:",isAdmin);
    
  const isUserAdmin = (memberId) => {
    return group?.admins?.some((admin) => {
      const adminId =
        admin?._id?.toString() ||
        admin?.toString();

      return adminId === memberId.toString();
    });
  };

  const toggleMember = (user) => {
    setSelectedMembers((prev) =>
      prev.some(
        (member) => member._id === user._id
      )
        ? prev.filter(
            (member) => member._id !== user._id
          )
        : [...prev, user]
    );
  };

  const handleAddMembers = async () => {
    if (!selectedMembers.length) return;

    try {
      setAddingMembers(true);
      setError("");

      const memberIds = selectedMembers.map(
        (member) => member._id
      );

      const data = await addGroupMembers(
        groupId,
        memberIds,
        token
      );

      setGroup(data.group);
      closeAddMembers();
    } catch (err) {
      console.error("Add members error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to add members"
      );
    } finally {
      setAddingMembers(false);
    }
  };

  const closeAddMembers = () => {
    setShowAddMembers(false);
    setMemberSearch("");
    setSearchResults([]);
    setSelectedMembers([]);
    setSearching(false);
  };

  const openEditInfo = () => {
    setGroupName(group.name || "");
    setGroupBio(group.bio || "");
    setGroupImage(null);
    setImagePreview(
      group.groupImage
        ? getImageUrl(group.groupImage)
        : ""
    );
    setError("");
    setShowEditInfo(true);
  };

  const closeEditInfo = () => {
    setShowEditInfo(false);
    setGroupName("");
    setGroupBio("");
    setGroupImage(null);
    setImagePreview("");
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    setGroupImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleUpdateGroup = async () => {
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }

    try {
      setUpdatingGroup(true);
      setError("");

      const data = await updateGroup(
        groupId,
        groupName.trim(),
        groupBio.trim(),
        groupImage,
        token
      );

      setGroup(data.group);
      closeEditInfo();
    } catch (err) {
      console.error("Update group error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to update group"
      );
    } finally {
      setUpdatingGroup(false);
    }
  };

  const handleAdminAction = async (
    memberId,
    action
  ) => {
    try {
      setActionLoading(memberId);
      setError("");

      const data = await updateGroupAdmin(
        groupId,
        memberId,
        action,
        token
      );

      setGroup(data.group);
    } catch (err) {
      console.error("Admin action error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to update admin"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (
      !window.confirm(
        "Remove this participant from the group?"
      )
    ) {
      return;
    }

    try {
      setActionLoading(memberId);
      setError("");

      const data = await removeGroupMember(
        groupId,
        memberId,
        token
      );

      setGroup(data.group);
    } catch (err) {
      console.error("Remove member error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to remove member"
      );
    } finally {
      setActionLoading("");
    }
  };

  const handleLeaveGroup = async () => {
    if (
      !window.confirm(
        "Are you sure you want to leave this group?"
      )
    ) {
      return;
    }

    try {
      setActionLoading("leave");
      setError("");

      await leaveGroup(groupId, token);

      navigate("/");
    } catch (err) {
      console.error("Leave group error:", err);
      setError(
        err.response?.data?.message ||
          "Failed to leave group"
      );
    } finally {
      setActionLoading("");
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f5f6f6]">
        <p className="text-gray-500">
          Loading group info...
        </p>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f5f6f6]">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (!group) return null;

  return (
    <div className="min-h-screen bg-[#f5f6f6]">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto h-16 px-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() =>
              navigate(`/group/${groupId}`)
            }
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100"
          >
            <ArrowLeft size={21} />
          </button>

          <div>
            <h1 className="font-semibold text-gray-900">
              Group Info
            </h1>

            <p className="text-xs text-gray-500">
              {group.members?.length || 0} participants
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto pb-8">
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
            {error}
          </div>
        )}

        <section className="bg-white px-5 py-8 text-center">
          <div className="relative w-32 h-32 mx-auto">
            {group.groupImage ? (
              <img
                src={getImageUrl(group.groupImage)}
                alt={group.name}
                className="w-32 h-32 rounded-full object-cover"
              />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                <Users
                  size={48}
                  className="text-gray-500"
                />
              </div>
            )}

            {isAdmin && (
              <button
                type="button"
                onClick={openEditInfo}
                className="absolute bottom-1 right-1 w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shadow-md hover:bg-green-600"
              >
                <Camera size={19} />
              </button>
            )}
          </div>

          <h2 className="mt-5 text-2xl font-semibold text-gray-900">
            {group.name}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Group · {group.members?.length || 0} participants
          </p>
        </section>

        <section className="mt-2 bg-white px-5 py-5">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            About
          </p>

          <p className="mt-2 text-gray-800 leading-relaxed">
            {group.bio || "No group description"}
          </p>
        </section>

        <section className="mt-2 bg-white">
          <div className="px-5 py-4 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">
              {group.members?.length || 0} participants
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() =>
                setShowAddMembers(true)
              }
              className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50"
            >
              <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center">
                <Plus
                  size={21}
                  className="text-green-600"
                />
              </div>

              <div className="text-left">
                <p className="font-medium text-gray-900">
                  Add participants
                </p>

                <p className="text-sm text-gray-500">
                  Add people to this group
                </p>
              </div>
            </button>
          )}

          {group.members?.map((member) => {
            const memberId =
              member._id?.toString() ||
              member.toString();

            const memberIsAdmin =
              isUserAdmin(memberId);

            const isCurrentUser =
              memberId === currentUserId;

            const loadingMember =
              actionLoading === memberId;

            return (
              <div
                key={memberId}
                className="px-5 py-3.5 flex items-center gap-4 border-t border-gray-100"
              >
                {member.profileImage ? (
                  <img
                    src={getImageUrl(
                      member.profileImage
                    )}
                    alt={member.name}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <Users
                      size={21}
                      className="text-gray-500"
                    />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {isCurrentUser
                      ? "You"
                      : member.name}
                  </p>

                  {member.username && (
                    <p className="text-sm text-gray-500 truncate">
                      @{member.username}
                    </p>
                  )}

                  {memberIsAdmin && (
                    <p className="text-xs text-green-600 mt-0.5">
                      Group admin
                    </p>
                  )}
                </div>

                {memberIsAdmin && (
                  <Shield
                    size={18}
                    className="text-green-600 flex-shrink-0"
                  />
                )}

                {isAdmin &&
                  !isCurrentUser &&
                  !loadingMember && (
                    <div className="flex items-center gap-1">
                      {memberIsAdmin ? (
                        <button
                          type="button"
                          title="Remove admin"
                          onClick={() =>
                            handleAdminAction(
                              memberId,
                              "remove"
                            )
                          }
                          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-gray-100"
                        >
                          <ShieldOff
                            size={17}
                            className="text-gray-600"
                          />
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Make admin"
                          onClick={() =>
                            handleAdminAction(
                              memberId,
                              "add"
                            )
                          }
                          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-green-50"
                        >
                          <Shield
                            size={17}
                            className="text-green-600"
                          />
                        </button>
                      )}

                      <button
                        type="button"
                        title="Remove participant"
                        onClick={() =>
                          handleRemoveMember(
                            memberId
                          )
                        }
                        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-red-50"
                      >
                        <Trash2
                          size={17}
                          className="text-red-500"
                        />
                      </button>
                    </div>
                  )}

                {loadingMember && (
                  <span className="text-xs text-gray-400">
                    Updating...
                  </span>
                )}
              </div>
            );
          })}
        </section>

        <section className="mt-2 bg-white">
          {isAdmin && (
            <button
              type="button"
              onClick={openEditInfo}
              className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50"
            >
              <div className="w-10 h-10 flex items-center justify-center">
                <Edit
                  size={20}
                  className="text-gray-600"
                />
              </div>

              <span className="text-gray-900">
                Edit group info
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleLeaveGroup}
            disabled={actionLoading === "leave"}
            className="w-full px-5 py-4 flex items-center gap-4 text-red-500 hover:bg-red-50 disabled:opacity-50"
          >
            <div className="w-10 h-10 flex items-center justify-center">
              <LogOut size={20} />
            </div>

            <span>
              {actionLoading === "leave"
                ? "Leaving..."
                : "Leave group"}
            </span>
          </button>
        </section>
      </main>

      {showEditInfo && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-lg">
                Edit group info
              </h2>

              <button
                type="button"
                onClick={closeEditInfo}
                className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              <div className="flex justify-center">
                <label className="relative cursor-pointer">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Group"
                      className="w-28 h-28 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-28 h-28 rounded-full bg-gray-200 flex items-center justify-center">
                      <Users
                        size={40}
                        className="text-gray-500"
                      />
                    </div>
                  )}

                  <div className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center">
                    <Camera size={17} />
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="mt-5">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Group name
                </label>

                <input
                  type="text"
                  value={groupName}
                  onChange={(e) =>
                    setGroupName(e.target.value)
                  }
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-green-500"
                  placeholder="Group name"
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  About
                </label>

                <textarea
                  value={groupBio}
                  onChange={(e) =>
                    setGroupBio(e.target.value)
                  }
                  maxLength={500}
                  rows={4}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-green-500 resize-none"
                  placeholder="Group description"
                />

                <p className="text-xs text-gray-400 text-right mt-1">
                  {groupBio.length}/500
                </p>
              </div>

              <button
                type="button"
                onClick={handleUpdateGroup}
                disabled={
                  updatingGroup ||
                  !groupName.trim()
                }
                className="w-full mt-5 py-3 bg-green-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {updatingGroup
                  ? "Saving..."
                  : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddMembers && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-lg">
                  Add participants
                </h2>

                <p className="text-xs text-gray-500 mt-0.5">
                  Search and select people
                </p>
              </div>

              <button
                type="button"
                onClick={closeAddMembers}
                className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 bg-gray-50">
                <Search
                  size={18}
                  className="text-gray-400"
                />

                <input
                  type="text"
                  value={memberSearch}
                  onChange={(e) =>
                    setMemberSearch(e.target.value)
                  }
                  placeholder="Search users"
                  className="w-full py-3 bg-transparent outline-none"
                  autoFocus
                />
              </div>

              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {selectedMembers.map((member) => (
                    <button
                      key={member._id}
                      type="button"
                      onClick={() =>
                        toggleMember(member)
                      }
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm"
                    >
                      {member.name}
                      <X size={13} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="max-h-72 overflow-y-auto">
              {searching && (
                <p className="text-center text-sm text-gray-500 py-6">
                  Searching...
                </p>
              )}

              {!searching &&
                memberSearch.trim() &&
                searchResults.length === 0 && (
                  <p className="text-center text-sm text-gray-500 py-6">
                    No users found
                  </p>
                )}

              {!memberSearch.trim() &&
                selectedMembers.length === 0 && (
                  <p className="text-center text-sm text-gray-500 py-6">
                    Search for users to add
                  </p>
                )}

              {searchResults.map((user) => {
                const selected =
                  selectedMembers.some(
                    (member) =>
                      member._id === user._id
                  );

                return (
                  <button
                    key={user._id}
                    type="button"
                    onClick={() =>
                      toggleMember(user)
                    }
                    className="w-full px-5 py-3 flex items-center gap-3 hover:bg-gray-50"
                  >
                    {user.profileImage ? (
                      <img
                        src={getImageUrl(
                          user.profileImage
                        )}
                        alt={user.name}
                        className="w-11 h-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center">
                        <Users
                          size={19}
                          className="text-gray-500"
                        />
                      </div>
                    )}

                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900">
                        {user.name}
                      </p>

                      {user.username && (
                        <p className="text-sm text-gray-500">
                          @{user.username}
                        </p>
                      )}
                    </div>

                    {selected && (
                      <div className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-sm">
                        ✓
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="p-4 border-t">
              <button
                type="button"
                onClick={handleAddMembers}
                disabled={
                  !selectedMembers.length ||
                  addingMembers
                }
                className="w-full py-3 bg-green-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {addingMembers
                  ? "Adding..."
                  : `Add ${
                      selectedMembers.length || ""
                    } participants`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GroupInfo;