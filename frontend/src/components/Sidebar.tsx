import { useCurrentUser, useLogout } from "../hooks/useAuth";

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const user = useCurrentUser();
  const logout = useLogout();
  const navItems = [
    { id: "all", label: "All Applications", icon: "apps" },
    { id: "development", label: "Development", icon: "code" },
    { id: "production", label: "Production", icon: "cloud" },
  ];

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-gray-900/50 border-r border-gray-800 p-4">
      <div className="flex flex-col gap-4 flex-grow">
        <div className="flex gap-3 items-center">
          <div
            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10"
            style={{
              backgroundImage: `url("https://lh3.googleusercontent.com/aida-public/AB6AXuA5ob0yeSKaZKW3fzLl0xb73tVKnMKw55emXfhosvhCoDF9Us8d-ynkNX9264cL-0P4KC1hvoTCKH42UbwfMPvmNChGVQBAavd_CKgn8jekRwGKh57Za3gsuAv_HkWG8TFEiL4Q9Mpe8aYYDfcy3h8JyYpo7mAYPa8Z5_UzZfqiefpFylC8ML0anzwTZ6j5oQSQ0fTgIcGNFT3vmC36DWmiZ1hIHCdVvwL27nc1YsGKXnbno-q6o-RixY_nOsSWKPXJqsYrTn1GKp8T")`,
            }}
          ></div>
          <div className="flex flex-col">
            <h1 className="text-white text-base font-medium leading-normal">
              Docker Manager
            </h1>
            <p className="text-gray-400 text-sm font-normal leading-normal">
              {user.data?.username ?? "—"}
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-2 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-150 ${
                activeView === item.id
                  ? "bg-primary/20 text-primary"
                  : "hover:bg-white/5"
              }`}
            >
              <span
                className={`material-symbols-outlined ${
                  activeView === item.id ? "text-white" : "text-gray-400"
                }`}
              >
                {item.icon}
              </span>
              <p
                className={`text-sm font-medium leading-normal ${
                  activeView === item.id ? "text-white" : "text-gray-300"
                }`}
              >
                {item.label}
              </p>
            </button>
          ))}
        </nav>
      </div>

      <div className="flex flex-col gap-1">
        <button
          onClick={() => onViewChange("settings")}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors duration-150"
        >
          <span className="material-symbols-outlined text-gray-400">
            settings
          </span>
          <p className="text-gray-300 text-sm font-medium leading-normal">
            Settings
          </p>
        </button>
        <button
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors duration-150 disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-gray-400">
            logout
          </span>
          <p className="text-gray-300 text-sm font-medium leading-normal">
            {logout.isPending ? "ログアウト中…" : "ログアウト"}
          </p>
        </button>
      </div>
    </aside>
  );
}
