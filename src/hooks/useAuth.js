import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function useAuth() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Lấy session hiện tại
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) fetchProfile(data.session.user.id);
      else setLoading(false);
    });

    // Lắng nghe thay đổi auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      if (sess) fetchProfile(sess.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from("profiles")
      .select("*, departments(id, name, color)")
      .eq("id", userId)
      .single();
    setProfile(data);
    setLoading(false);
  }

  async function signUp(email, password, fullName, departmentId) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;

    // Tạo profile ngay sau khi đăng ký
    if (data.user) {
      const { error: pErr } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        department_id: departmentId,
      });
      if (pErr) throw pErr;
    }
    return data;
  }

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { session, profile, loading, signUp, signIn, signOut, refetchProfile: () => session && fetchProfile(session.user.id) };
}
