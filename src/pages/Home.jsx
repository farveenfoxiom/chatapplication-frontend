import { MessageCircle, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import Navbar from "../components/Navbar";
import ChatList from "../components/ChatList";

function Home() {
  const navigate = useNavigate();
  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      <Navbar />
      <main className="flex-1 flex overflow-hidden">
        <ChatList />
        <section className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <MessageCircle
                size={32}
                className="text-green-600"/>
            </div>
            <h2 className="text-xl font-semibold text-gray-800">
              Select a conversation
            </h2>
            <p className="text-gray-500 mt-2">
              Choose a chat to start messaging
            </p>
          </div>
        </section>
      </main>
      <button
        onClick={() => navigate("/search")}
        className="fixed bottom-10 right-10 w-14 h-14 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg hover:bg-green-600 hover:scale-105 transition-all duration-200"
        title="Start a new chat">
        <Plus size={28} />
      </button>

    </div>
  );
}
export default Home;