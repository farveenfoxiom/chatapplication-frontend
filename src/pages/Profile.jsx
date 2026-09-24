import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Camera,
  Edit2,
  LogOut,
  User,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { getMe, updateMe , uploadProfileImage } from "../services/userService";
import { useSelector,useDispatch } from "react-redux";
import { updateUser,logout } from "../redux/slices/authSlice";
import { API_BASE_URL, SOCKET_URL } from "../config"; 
import { getImageUrl } from "../utils/getImageUrl";

function Profile() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const dispatch = useDispatch();
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await getMe(token);
        setProfile(data.user);
        setFormData(data.user);
      } catch (error) {
        console.error("Fetch profile error:", error);
        setError(
          error.response?.data?.message ||
            "Failed to load profile"
        );
      } finally {
        setLoading(false);
      }
    };
    if (token) {
      fetchProfile();
    }
  }, [token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      setSaving(true);
      setError("");
      const data = await uploadProfileImage(file, token);
      setFormData((previous) => ({
        ...previous,
        profileImage: data.profileImage,
      }));
      dispatch(updateUser({
        ...user,
        profileImage: data.profileImage,
      }));
    } catch (error) {
      console.error("Profile image upload error:", error);
      setError(
        error.response?.data?.message ||
          "Failed to upload profile image"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setFormData(profile);
    setIsEditing(true);
    setError("");
  };

  const handleCancel = () => {
    setFormData(profile);
    setIsEditing(false);
    setError("");
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      const data = await updateMe(formData, token);
      setProfile(data.user);
      setFormData(data.user);
      dispatch(updateUser(data.user));
      setIsEditing(false);
    } catch (error) {
      console.error("Update profile error:", error);
      setError(
        error.response?.data?.message ||
          "Failed to update profile"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">
          Loading profile...
        </p>
      </div>
    );
  }

  if (!profile || !formData) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-red-500">
          {error || "Profile not found"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 md:px-6">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <h1 className="text-lg md:text-xl font-semibold text-gray-900 ml-3">
          Profile
        </h1>
      </header>

      <main className="max-w-xl mx-auto p-4 md:p-6">
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex flex-col items-center px-6 pt-8 pb-6 border-b border-gray-100">
            <div className="relative">
              {formData.profileImage ? (
                <img
                  src={getImageUrl(formData.profileImage)}
                  alt="Profile"
                  className="w-28 h-28 rounded-full object-cover"
                />
              ) : (
                <div className="w-28 h-28 rounded-full bg-green-100 flex items-center justify-center">
                  <User
                    size={48}
                    className="text-green-600"
                  />
                </div>
              )}
              {isEditing && (
                <>
                  <label
                    htmlFor="profileImage"
                    className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-green-500 flex items-center justify-center border-4 border-white hover:bg-green-600 transition cursor-pointer">
                    <Camera size={17} className="text-white"/> 
                  </label>
                  <input
                    id="profileImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"/>
                </>
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mt-4">
              {formData.name}
            </h2>
            <p className="text-gray-500 mt-1">
              @{formData.username}
            </p>
            <p className="text-sm text-gray-500 text-center mt-3 max-w-sm">
              {formData.bio}
            </p>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-gray-900">
                Personal Information
              </h3>
              {!isEditing && (
                <button
                  onClick={handleEdit}
                  className="flex items-center gap-2 text-sm text-green-600 font-medium hover:text-green-700">
                  <Edit2 size={16} />
                  Edit
                </button>
              )}
            </div>
            {error && (
              <p className="text-sm text-red-500 mb-4">
                {error}
              </p>
            )}
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"/>
                ) : (
                  <p className="text-gray-900 bg-gray-50 rounded-xl px-4 py-3">
                    {profile.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"/>
                ) : (
                  <p className="text-gray-900 bg-gray-50 rounded-xl px-4 py-3">
                    @{profile.username}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"/>
                ) : (
                  <p className="text-gray-900 bg-gray-50 rounded-xl px-4 py-3">
                    {profile.email}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio
                </label>
                {isEditing ? (
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    maxLength={150}
                    rows={3}
                    placeholder="Write something about yourself..."
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none resize-none focus:ring-2 focus:ring-green-500"/>
                ) : (
                  <p className="text-gray-900 bg-gray-50 rounded-xl px-4 py-3">
                    {profile.bio || "No bio added yet."}
                  </p>
                )}
                {isEditing && (
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {formData.bio.length}/150
                  </p>
                )}
              </div>
            </div>
            {isEditing && (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="flex-1 border border-gray-200 rounded-xl py-3 font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-green-500 text-white rounded-xl py-3 font-medium hover:bg-green-600 transition disabled:opacity-50">
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
          <div className="px-6 pb-6">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-500 rounded-xl py-3 font-medium hover:bg-red-50 transition">
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Profile;