import { MessageCircle, User } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
      <Link to="/" className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center">
          <MessageCircle className="text-white" size={20}/>
        </div>
        <span className="text-xl font-bold text-gray-900">
          ChatApp
        </span>
      </Link>
      <Link
        to="/profile"
        className="flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center overflow-hidden shrink-0">
          {user?.profileImage ? (
            <img
              src={`http://localhost:5000${user.profileImage}`}
              alt={user.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <User
              size={21}
              className="text-green-600"
            />
          )}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-gray-900">
            {user?.name || "User"}
          </p>
        </div>
      </Link>
    </header>
  );
}
export default Navbar;