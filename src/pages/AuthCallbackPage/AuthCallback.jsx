import { useEffect } from "react";
import { useNavigate } from "react-router";
import { supabase } from "lib/supabaseClient";

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      // Supabase שומר את הסשן אוטומטית מתוך ה-URL
      const { data } = await supabase.auth.getSession();

      // מנקה את ה-#... מהכתובת (כדי שלא יישאר access_token בשורת הכתובת)
      window.history.replaceState({}, document.title,  "/#/auth/callback");

      if (data.session) navigate("/home", { replace: true });
      else navigate("/login", { replace: true });
    })();
  }, [navigate]);

  return <div style={{ padding: 24 }}>מתחבר...</div>;
}
