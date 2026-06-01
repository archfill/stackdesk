import Sidebar from "./components/Sidebar";
import AppList from "./components/AppList";
import AuthGate from "./components/AuthGate";
import TokenManager from "./components/TokenManager";
import UserManager from "./components/UserManager";
import { useViewStore } from "./stores/useViewStore";

function App() {
  const { activeView, setActiveView } = useViewStore();

  return (
    <AuthGate>
      <div className="flex min-h-screen bg-[color:var(--color-ink-0)] text-[color:var(--color-text-1)]">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />
        {activeView === "tokens" ? (
          <TokenManager />
        ) : activeView === "users" ? (
          <UserManager />
        ) : (
          <AppList />
        )}
      </div>
    </AuthGate>
  );
}

export default App;
