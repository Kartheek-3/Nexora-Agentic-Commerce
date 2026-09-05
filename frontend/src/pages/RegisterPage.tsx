import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, Mail, User } from "lucide-react";
import { AuthCard } from "../components/auth/AuthCard";
import { AuthField } from "../components/auth/AuthField";
import { AuthShell } from "../components/auth/AuthShell";
import { GoogleAuthButton } from "../components/auth/GoogleAuthButton";
import { PasswordField } from "../components/auth/PasswordField";
import { Button } from "../components/ui/Button";
import { loginWithGoogle, mapFirebaseError, registerWithEmail } from "../services/auth";

function emailLooksValid(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;
  if (/\d|[^A-Za-z]/.test(password)) score += 1;
  if (score <= 1) return { label: "Weak", className: "bg-red-300", text: "text-red-200", width: "w-1/3" };
  if (score === 2) return { label: "Fair", className: "bg-warning", text: "text-yellow-100", width: "w-2/3" };
  return { label: "Strong", className: "bg-emerald-300", text: "text-emerald-100", width: "w-full" };
}

export default function RegisterPage() {
  const [created, setCreated] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [merchantName, setMerchantName] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState<"email" | "google" | "">("");
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; confirmPassword?: string }>({});
  const navigate = useNavigate();
  const strength = passwordStrength(password);
  const busy = Boolean(loading);

  const validate = () => {
    const nextErrors: typeof errors = {};
    if (!merchantName.trim()) nextErrors.name = "Enter your name.";
    if (!emailLooksValid(email)) nextErrors.email = "Enter a valid email address.";
    if (password.length < 8) nextErrors.password = "Password must contain at least 8 characters.";
    if (password !== confirmPassword) nextErrors.confirmPassword = "Passwords do not match.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!validate()) return;
    setLoading("email");
    setMessage("");
    try {
      await registerWithEmail(email, password);
      setCreated(true);
      window.setTimeout(() => navigate("/merchant"), 350);
    } catch (error) {
      setMessage(mapFirebaseError(error));
    } finally {
      setLoading("");
    }
  };

  const submitGoogle = async () => {
    setLoading("google");
    setMessage("");
    try {
      await loginWithGoogle();
      setCreated(true);
      window.setTimeout(() => navigate("/merchant"), 350);
    } catch (error) {
      setMessage(mapFirebaseError(error));
    } finally {
      setLoading("");
    }
  };

  return (
    <AuthShell>
      <AuthCard eyebrow="Create your account" title="Start with NEXORA" subtitle="Build safer, auditable AI commerce experiences.">
        <GoogleAuthButton loading={loading === "google"} disabled={busy && loading !== "google"} onClick={submitGoogle} />
        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-ivory/[0.38]"><span className="h-px flex-1 bg-line" />OR<span className="h-px flex-1 bg-line" /></div>
        <form onSubmit={submit}>
          <AuthField id="register-name" label="Name" autoComplete="name" placeholder="Karthik" value={merchantName} onChange={(event) => setMerchantName(event.currentTarget.value)} error={errors.name} icon={<User size={16} />} disabled={busy} />
          <AuthField id="register-email" label="Email" type="email" autoComplete="email" placeholder="merchant@nexora.ai" value={email} onChange={(event) => setEmail(event.currentTarget.value)} error={errors.email} icon={<Mail size={16} />} disabled={busy} />
          <PasswordField id="register-password" label="Password" autoComplete="new-password" placeholder="Create a strong password" value={password} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} onChange={setPassword} error={errors.password} disabled={busy} />
          {password ? (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <span className={`block h-full rounded-full ${strength.className} ${strength.width}`} />
              </div>
              <p className={`mt-2 text-xs font-medium ${strength.text}`}>{strength.label} password</p>
            </div>
          ) : null}
          <PasswordField id="register-confirm-password" label="Confirm password" autoComplete="new-password" placeholder="Confirm your password" value={confirmPassword} visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} onChange={setConfirmPassword} error={errors.confirmPassword} disabled={busy} />
          <Button className="mt-5 w-full" type="submit" loading={loading === "email"} disabled={busy && loading !== "email"} icon={loading === "email" ? <Loader2 className="animate-spin" size={16} /> : undefined}>{loading === "email" ? "Creating account..." : "Create account"}</Button>
        </form>
        {created ? <p className="mt-4 rounded-md border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">Welcome to NEXORA</p> : null}
        {message ? <p className="mt-4 rounded-md border border-line bg-black/25 p-3 text-sm text-ivory/[0.68]">{message}</p> : null}
        <p className="mt-5 text-sm text-ivory/[0.54]">Already have an account? <Link className="font-semibold text-ember underline-offset-4 transition hover:text-gold hover:underline" to="/login">Sign in</Link></p>
      </AuthCard>
    </AuthShell>
  );
}
