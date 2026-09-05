import { Loader2 } from "lucide-react";
import { Button } from "../ui/Button";

type GoogleAuthButtonProps = {
  loading: boolean;
  onClick: () => void;
  label?: string;
  disabled?: boolean;
};

export function GoogleAuthButton({ loading, onClick, label = "Continue with Google", disabled }: GoogleAuthButtonProps) {
  return (
    <Button
      className="mt-6 w-full gap-3 border-white/12 bg-white/[0.06] text-ivory shadow-none hover:-translate-y-px hover:border-white/20 hover:bg-white/[0.10] hover:text-ivory"
      loading={loading}
      disabled={disabled}
      variant="secondary"
      icon={loading ? <Loader2 className="animate-spin" size={18} /> : <img src="/google-logo.svg" alt="" className="h-5 w-5 shrink-0" />}
      onClick={onClick}
    >
      {loading ? "Connecting to Google..." : label}
    </Button>
  );
}
