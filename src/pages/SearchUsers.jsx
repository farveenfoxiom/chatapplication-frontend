import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Search, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { searchUsers } from "../services/userService";
import { useSelector } from "react-redux";

import { API_BASE_URL, SOCKET_URL } from "../config"; 

function SearchUsers() {
  const navigate = useNavigate();
  const token = useSelector((state) => state.auth.token);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const observerRef = useRef(null);
  const handleSearch = async (e) => {
    const value = e.target.value;
    setSearch(value);
    setError("");
    setSkip(0);
    setHasMore(true);
    if (value.trim() === "") {
      setUsers([]);
      return;
    }
    try {
      setLoading(true);
      const data = await searchUsers(value,token,0,7);
      setUsers(data.users);
      setSkip(data.users.length);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Search users error:", error);
      setError(
        error.response?.data?.message ||
          "Failed to search users"
      );
    } finally {
      setLoading(false);
    }
  };
  const loadMoreUsers = async () => {
    if (loading ||loadingMore ||!hasMore ||search.trim() === "") {
      return;
    }
    try {
      setLoadingMore(true);
      const data = await searchUsers(search,token,skip,7)
      setUsers((prevUsers) => [
        ...prevUsers,
        ...data.users,
      ]);
      setSkip((prevSkip) => prevSkip + data.users.length);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error(
        "Load more users error:",
        error
      );
    } finally {
      setLoadingMore(false);
    }
  };
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMoreUsers();
        }
      },
      {
        threshold: 0.1,
      }
    );
    if (observerRef.current) {
      observer.observe(observerRef.current);
    }
    return () => {
      if (observerRef.current) {
        observer.unobserve(observerRef.current);
      }
    };
  }, [
    skip,
    hasMore,
    search,
    loading,
    loadingMore,
  ]);
  const handleUserClick = (userId) => {
    navigate(`/chat/${userId}`);
  };
  return (
    <div className="min-h-screen bg-gray-100">
      <header className="h-16 bg-white border-b border-gray-200 flex items-center gap-4 px-4 md:px-6">
        <button
          onClick={() => navigate("/")}
          className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition">
          <ArrowLeft size={21} />
        </button>
        <h1 className="text-xl font-bold text-gray-900">
          New Chat
        </h1>
      </header>
      <main className="max-w-2xl mx-auto p-4">
        <div className="relative mb-6">
          <Search
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input
            type="text"
            value={search}
            onChange={handleSearch}
            placeholder="Search by name, username or email"
            autoFocus
            className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-green-500"/>
        </div>
        {loading && (
          <p className="text-center text-gray-400">
            Searching...
          </p>
        )}
        {!loading && error && (
          <p className="text-center text-red-500">
            {error}
          </p>
        )}
        {!loading &&
          !error &&
          search.trim() !== "" &&
          users.length === 0 && (
            <p className="text-center text-gray-400">
              No users found
            </p>
          )}
        <div className="space-y-2">
          {!loading &&
            users.map((user) => (
              <button
                key={user._id}
                onClick={() =>handleUserClick(user._id)}
                className="w-full bg-white flex items-center gap-4 p-4 rounded-xl hover:bg-gray-50 transition text-left">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                  {user.profileImage ? (
                    <img
                      src={`${API_BASE_URL}${user.profileImage}`}
                      alt={user.name}
                      className="w-12 h-12 rounded-full object-cover"/>
                  ) : (
                    <User size={22}
                      className="text-green-600"/>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900">
                    {user.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    @{user.username}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {user.email}
                  </p>
                </div>
              </button>
            ))}
        </div>
        {hasMore && search.trim() !== "" && (
          <div
            ref={observerRef}
            className="h-12 flex items-center justify-center">
            {loadingMore && (
              <p className="text-sm text-gray-400">
                Loading more...
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default SearchUsers;