import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthField } from "../components/auth/AuthField";
import { AuthShell } from "../components/auth/AuthShell";
import { GoogleAuthButton } from "../components/auth/GoogleAuthButton";
import { PasswordField } from "../components/auth/PasswordField";
import { Button } from "../components/ui/Button";
import { loginWithEmail, loginWithGoogle, mapFirebaseError, resetPassword } from "../services/auth";

function emailLooksValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export default function LoginPage() {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"email" | "google" | "reset" | "">("");
  const navigate = useNavigate();
  const busy = Boolean(loading);

  const validate = () => {
    const nextErrors: typeof errors = {};
    if (!emailLooksValid(email)) nextErrors.email = "Enter a valid email address.";
    if (!password) nextErrors.password = "Enter your password.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submitEmail = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!validate()) return;
    setLoading("email");
    setMessage("");
    setSuccess("");
    try {
      await loginWithEmail(email, password);
      setSuccess("Welcome to NEXORA");
      navigate("/merchant");
    } catch (error) {
      setMessage(mapFirebaseError(error));
    } finally {
      setLoading("");
    }
  };

  const submitGoogle = async () => {
    setLoading("google");
    setMessage("");
    setSuccess("");
    try {
      await loginWithGoogle();
      setSuccess("Welcome to NEXORA");
      navigate("/merchant");
    } catch (error) {
      setMessage(mapFirebaseError(error));
    } finally {
      setLoading("");
    }
  };

  const sendReset = async () => {
    setMessage("");
    setSuccess("");
    if (!emailLooksValid(email)) {
      setErrors((current) => ({ ...current, email: "Enter your email first to reset your password." }));
      return;
    }
    setLoading("reset");
    try {
      await resetPassword(email);
      setSuccess("Password reset email sent.");
    } catch (error) {
      setMessage(mapFirebaseError(error));
    } finally {
      setLoading("");
    }
  };

  return (
    <AuthShell>
      <AuthCard eyebrow="Welcome back" title="Sign in to NEXORA" subtitle="Continue your agentic commerce workspace.">
        <GoogleAuthButton loading={loading === "google"} disabled={busy && loading !== "google"} onClick={submitGoogle} />
        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-ivory/[0.38]"><span className="h-px flex-1 bg-line" />OR<span className="h-px flex-1 bg-line" /></div>
        <form onSubmit={submitEmail}>
          <AuthField id="login-email" label="Email" type="email" autoComplete="email" placeholder="merchant@nexora.ai" value={email} onChange={(event) => setEmail(event.currentTarget.value)} error={errors.email} icon={<Mail size={16} />} disabled={busy} />
          <PasswordField id="login-password" label="Password" autoComplete="current-password" placeholder="Enter your password" value={password} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} onChange={setPassword} error={errors.password} disabled={busy} />
          <div className="mt-3 flex justify-end">
            <button type="button" className="text-sm font-medium text-ember underline-offset-4 transition hover:text-gold hover:underline disabled:cursor-not-allowed disabled:opacity-50" disabled={busy} onClick={sendReset}>
              {loading === "reset" ? "Sending..." : "Forgot password?"}
            </button>
          </div>
          <Button className="mt-5 w-full" type="submit" loading={loading === "email"} disabled={busy && loading !== "email"} icon={loading === "email" ? <Loader2 className="animate-spin" size={16} /> : undefined}>
            {loading === "email" ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        {success ? <p className="mt-4 rounded-md border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">{success}</p> : null}
        {message ? <p className="mt-4 rounded-md border border-line bg-black/25 p-3 text-sm text-ivory/[0.68]">{message}</p> : null}
        <p className="mt-5 text-sm text-ivory/[0.54]">New to NEXORA? <Link className="font-semibold text-ember underline-offset-4 transition hover:text-gold hover:underline" to="/register">Create account</Link></p>
      </AuthCard>
    </AuthShell>
  );
}
