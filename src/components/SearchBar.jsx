import { Search } from "lucide-react";
function SearchBar({ value, onChange }) {
  return (
    <div className="relative">
      <Search
        size={19}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder="Search chats..."
        className="w-full bg-gray-100 border-none rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-green-500"/>
    </div>
  );
}

export default SearchBar;
