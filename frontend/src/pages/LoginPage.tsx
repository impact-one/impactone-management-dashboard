import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "../app/AuthContext";
import { ErrorNote } from "../components/PageHeader";
import { Logo } from "../components/Logo";
import { useTitle } from "../lib/useTitle";

export function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState("mikolaj@impactone.example");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  useTitle("Sign in");

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await login(email, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Sign-in failed.");
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-svh lg:grid-cols-[0.92fr_1.08fr]">
      <section className="relative overflow-hidden border-b border-border bg-[linear-gradient(160deg,var(--background)_0%,color-mix(in_oklch,var(--accent)_55%,white)_100%)] px-6 py-10 sm:px-10 lg:border-r lg:border-b-0 lg:px-14 lg:py-16">
        <div
          className="orb pointer-events-none absolute -top-16 -right-10 size-56 rounded-full bg-primary/10 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute bottom-8 left-8 size-40 rounded-full bg-[var(--brand-cyan)]/12 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex h-full max-w-md flex-col justify-center">
          <Logo className="h-10 text-foreground" />
          <p className="mt-10 text-xs font-medium text-primary">Impact One · IOC</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Management desk
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            One place for Impact One and IOC work — projects, deadlines, documents, and team updates from the tools you
            already use.
          </p>
          <ul className="mt-10 grid list-none gap-3 p-0 text-sm text-foreground">
            {[
              "Role-based access for leadership, managers, consultants, and viewers.",
              "Live Calendar, Drive, Slack, Otter, and ClickUp where credentials are connected.",
            ].map((point) => (
              <li key={point} className="rounded-xl bg-card/70 px-3.5 py-3 leading-6 text-muted-foreground ring-1 ring-border/50">
                <span className="text-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="flex items-center justify-center bg-card px-4 py-10">
        <Card className="surface w-full max-w-md rounded-2xl border-0 py-2 shadow-none ring-0">
          <CardHeader className="gap-1.5">
            <CardTitle className="text-2xl tracking-tight">Sign in</CardTitle>
            <CardDescription>Use your Impact One desk account to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4" action="/api/auth/login" method="post" onSubmit={onSubmit}>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  className="h-10"
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
                    className="h-10"
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
                    className="h-10"
                    aria-pressed={showPassword}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? "Hide" : "Show"}
                  </Button>
                </div>
              </div>
              {error ? <ErrorNote message={error} /> : null}
              <Button type="submit" className="h-10" disabled={pending}>
                {pending ? "Signing in…" : "Sign in"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
