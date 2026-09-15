import AppRoutes from "./routes/AppRoutes";
import SocketListener from "./components/SocketLisener";

function App() {
  return (
    <> 
    <SocketListener/>
    <AppRoutes/>
    </>
    
  );
}

export default App;