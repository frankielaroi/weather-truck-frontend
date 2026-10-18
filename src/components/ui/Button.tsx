import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  /** Shows progress and blocks presses; keep the label so the button doesn't resize much. */
  busy?: boolean;
};

const variants = {
  primary: "bg-foreground text-background hover:opacity-90",
  secondary: "border border-foreground/40 bg-background text-foreground hover:bg-foreground/10",
} as const;

/** A button that can't be pressed twice while `busy`: `<Button busy={loading}>Plan route</Button>`. */
export const Button = ({ variant = "primary", busy = false, disabled, className = "", children, ...rest }: Props): React.ReactElement => (
  <button
    type="button"
    {...rest}
    disabled={disabled || busy}
    aria-busy={busy || undefined}
    className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
  >
    {busy ? (
      <span aria-hidden="true" className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
    ) : null}
    {children}
  </button>
);
