import Sidebar from "./components/Sidebar";
import AppList from "./components/AppList";
import AuthGate from "./components/AuthGate";
import TokenManager from "./components/TokenManager";
import { useViewStore } from "./stores/useViewStore";

function App() {
  const { activeView, setActiveView } = useViewStore();

  return (
    <AuthGate>
      <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-gray-200">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        {activeView === "tokens" ? <TokenManager /> : <AppList />}
      </div>
    </AuthGate>
  );
}

export default App;
