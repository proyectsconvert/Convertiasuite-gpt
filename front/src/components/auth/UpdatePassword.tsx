import { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  // sessionReady = true cuando Supabase procesa el token del enlace de correo
  const [sessionReady, setSessionReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;

    // Parse URL params
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);

    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    const code = searchParams.get("code");
    const errorDesc = hashParams.get("error_description") || searchParams.get("error_description") || hashParams.get("error") || searchParams.get("error");
    const errorCode = hashParams.get("error_code") || searchParams.get("error_code");

    const checkInitialSession = async () => {
      // 1. Check if there was an error in the redirect
      if (errorDesc) {
        if (active) {
          console.error("Auth redirect error:", errorDesc, errorCode);
          setError(decodeURIComponent(errorDesc).replace(/\+/g, " "));
        }
        return;
      }

      // 2. If PKCE code is present, exchange it
      if (code) {
        try {
          console.log("Exchanging PKCE code for session...");
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error("PKCE exchange error:", error);
            if (active) setError(error.message);
          } else if (data?.session) {
            console.log("PKCE exchange successful, session established.");
            if (active) setSessionReady(true);
          } else {
            if (active) setError("No se pudo iniciar la sesión con el código de confirmación.");
          }
        } catch (err) {
          console.error("PKCE exchange exception:", err);
          if (active) setError("Error al verificar el código de confirmación.");
        }
        return;
      }

      // 3. If access_token is present in hash, set the session manually
      if (accessToken) {
        try {
          console.log("Setting session manually from hash...");
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || "",
          });
          if (error) {
            console.error("Set session error:", error);
            if (active) setError(error.message);
          } else if (data?.session) {
            console.log("Manual session set successful.");
            if (active) setSessionReady(true);
          } else {
            if (active) setError("No se pudo iniciar la sesión con el token de acceso.");
          }
        } catch (err) {
          console.error("Set session exception:", err);
          if (active) setError("Error al establecer la sesión desde el enlace.");
        }
        return;
      }

      // 4. Check if there is already an active session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("Active session found.");
          if (active) setSessionReady(true);
        } else {
          // If we had no session and no URL parameters to verify, show invalid link error
          if (active) {
            setError("Enlace de recuperación no válido o expirado. Por favor, solicita uno nuevo.");
          }
        }
      } catch (err) {
        console.error("Get session exception:", err);
        if (active) setError("Error al verificar el estado de la sesión.");
      }
    };

    // Listen for auth state changes as fallback/recovery events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change event:", event, !!session);
      if (!active) return;
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setSessionReady(true);
      }
    });

    checkInitialSession();

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error("Supabase password update error:", error);
        let errorMsg = error.message;
        if (!errorMsg || errorMsg === "{}" || typeof errorMsg !== "string") {
          errorMsg = "No se pudo actualizar la contraseña. Asegúrate de tener una sesión activa o que el enlace no haya expirado.";
        }
        setError(errorMsg);
      } else {
        setMessage("¡Tu contraseña ha sido cambiada con éxito! Redirigiendo...");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      }
    } catch (err) {
      console.error("Network or execution error during password update:", err);
      setError("Ocurrió un error inesperado. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground justify-center items-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm"
      >
        {/* HEADER */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <img
              src="/logo-dark.ico"
              alt="convert-IA"
              className="w-8 h-8 object-contain block dark:hidden"
            />
            <img
              src="/favicon.ico"
              alt="convert-IA"
              className="w-8 h-8 object-contain hidden dark:block"
            />
            <span className="text-lg font-semibold">Convert-IA</span>
          </div>

          <h2 className="text-3xl font-bold mt-4 mb-2">Nueva contraseña</h2>
          <p className="text-muted-foreground text-sm">
            Ingresa tu nueva clave de acceso para actualizar tu cuenta.
          </p>
        </div>

        {/* Esperando que Supabase procese el token del enlace */}
        {!sessionReady ? (
          <div className="flex flex-col items-center gap-4 py-6 text-muted-foreground text-sm">
            {!error ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span>Verificando enlace de recuperación...</span>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400 text-center mb-2"
              >
                {error}
              </motion.div>
            )}
            <p className="text-xs text-center text-muted-foreground/60">
              Si esto tarda más de unos segundos o hay un error, el enlace puede haber expirado.{" "}
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="underline hover:text-cyan-400 transition-colors"
              >
                Solicitar uno nuevo
              </button>
            </p>
          </div>
        ) : (
          /* FORM */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Nueva contraseña (mínimo 8 caracteres)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 pr-10 h-11"
                required
                minLength={8}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm text-red-400"
              >
                {error}
              </motion.div>
            )}

            {message && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-400"
              >
                {message}
              </motion.div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 font-medium"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Actualizando...
                </span>
              ) : (
                "Actualizar contraseña"
              )}
            </Button>
          </form>
        )}
      </motion.div>
    </div>
  );
}

