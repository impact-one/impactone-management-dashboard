import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { CheckIcon, CircleAlertIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "../app/AuthContext";
import { Logo } from "../components/Logo";
import { useTitle } from "../lib/useTitle";

const points = [
  "Role-based access for leadership, managers, consultants, and viewers.",
  "Live Calendar, Drive, Slack, Otter, and ClickUp where credentials are connected.",
];

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("mikolaj@impactone.example");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [resetNote, setResetNote] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useTitle("Sign in");

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await login(email, password, remember);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed.");
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-svh bg-white lg:grid-cols-2">
      <section className="order-2 flex items-center bg-[linear-gradient(180deg,oklch(0.985_0.012_155)_0%,oklch(0.965_0.024_155)_46%,oklch(0.94_0.035_155)_100%)] px-6 py-12 sm:px-10 lg:order-1 lg:px-16 xl:px-20">
        <div className="w-full max-w-md">
          <Logo className="h-9 text-foreground" />
          <p className="mt-10 text-[13px] font-medium text-foreground">Impact One · IOC</p>
          <h1 className="mt-2 text-[2rem] leading-tight font-semibold tracking-tight text-foreground sm:text-[2.15rem]">
            Management desk
          </h1>
          <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">
            One place for Impact One and IOC work — projects, deadlines, documents, and team updates from the tools you
            already use.
          </p>
          <ul className="mt-8 grid list-none gap-3 p-0">
            {points.map((point) => (
              <li
                key={point}
                className="flex items-start gap-3 rounded-xl border border-border/80 bg-white px-3.5 py-3 text-sm leading-6 text-muted-foreground shadow-[0_1px_2px_oklch(0.32_0.045_255/0.04)]"
              >
                <span
                  className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground"
                  aria-hidden="true"
                >
                  <CheckIcon className="size-3" strokeWidth={3} />
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="order-1 flex items-center justify-center px-4 py-10 sm:px-8 lg:order-2">
        <div className="w-full max-w-[26.5rem] rounded-2xl border border-border bg-white px-7 pt-7 pb-5 shadow-[0_12px_40px_-18px_oklch(0.32_0.045_255/0.22)]">
          <h2 className="text-[1.7rem] font-semibold tracking-tight text-foreground">Sign in</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">Use your Impact One desk account to continue.</p>

          <form className="mt-6 grid gap-4" action="/api/auth/login" method="post" onSubmit={onSubmit}>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                className="h-11 rounded-lg bg-white px-3"
                name="email"
                type="email"
                autoComplete="username"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="flex gap-2">
                <Input
                  id="password"
                  className="h-11 rounded-lg bg-white px-3"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  minLength={8}
                  required
                  enterKeyHint="done"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError("");
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 rounded-lg border-border bg-muted/70 px-4 text-sm font-medium text-foreground shadow-none hover:bg-muted"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? "Hide" : "Show"}
                </Button>
              </div>
            </div>

            {error ? (
              <Alert variant="destructive" className="rounded-lg">
                <CircleAlertIcon />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="relative inline-flex size-4 shrink-0">
                  <input
                    id="remember"
                    name="remember"
                    type="checkbox"
                    checked={remember}
                    onChange={(event) => setRemember(event.target.checked)}
                    className="peer size-4 appearance-none rounded-[4px] border border-input bg-white checked:border-primary checked:bg-primary focus-visible:ring-3 focus-visible:ring-ring/50"
                  />
                  <CheckIcon
                    className="pointer-events-none absolute inset-0 m-auto size-3 text-white opacity-0 peer-checked:opacity-100"
                    strokeWidth={3}
                    aria-hidden="true"
                  />
                </span>
                <Label htmlFor="remember" className="text-sm font-normal">
                  Keep me signed in
                </Label>
              </div>
              <button
                type="button"
                className="text-sm font-medium text-[color-mix(in_oklch,var(--primary)_62%,var(--brand-leaf))] underline-offset-4 hover:underline"
                aria-expanded={resetNote}
                aria-controls="password-help"
                onClick={() => setResetNote((current) => !current)}
              >
                Forgot password?
              </button>
            </div>

            {resetNote ? (
              <p id="password-help" className="text-sm leading-5 text-muted-foreground" role="status">
                Ask your Impact One administrator to reset your password.
              </p>
            ) : null}

            <Button type="submit" className="h-11 rounded-lg text-sm font-semibold" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 border-t border-border pt-4 text-center text-sm text-muted-foreground">
            Need access? Ask your Impact One administrator to add you.
          </p>
        </div>
      </section>
    </main>
  );
}
