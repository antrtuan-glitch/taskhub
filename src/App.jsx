import { useEffect } from "react";
import { useAuth } from "./hooks/useAuth";
import AuthScreen from "./components/AuthScreen";
import TaskHub from "./components/TaskHub";
import { Spinner } from "./components/ui";

export default function App() {
  const { session, profile, loading, signOut } = useAuth();

  // Đăng ký Service Worker khi app load
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  if (loading) return <Spinner />;

  // Chưa đăng nhập
  if (!session) return <AuthScreen onDone={() => {}} />;

  // Đã đăng nhập nhưng chưa có profile (hiếm, safety net)
  if (!profile) return <Spinner />;

  return <TaskHub profile={profile} onSignOut={signOut} />;
}
