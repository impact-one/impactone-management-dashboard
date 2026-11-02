import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "../app/AuthContext";
import { ErrorNote } from "../components/PageHeader";
import { Logo } from "../components/Logo";
import { useTitle } from "../lib/useTitle";

const accounts = [
  { name: "Mikolaj", email: "mikolaj@impactone.example", role: "Executive" },
  { name: "Kulde", email: "kulde@impactone.example", role: "Manager" },
  { name: "Zygm", email: "zygm@impactone.example", role: "Manager" },
  { name: "Saray", email: "saray@impactone.example", role: "Manager" },
  { name: "Pilot consultant", email: "consultant@impactone.example", role: "Consultant" },
  { name: "Tetia", email: "tetia@impactone.example", role: "Viewer" },
];

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
    <main className="grid min-h-svh lg:grid-cols-[0.95fr_1.05fr]">
      <section className="relative border-b border-border bg-muted/50 px-6 py-10 sm:px-10 lg:border-r lg:border-b-0 lg:px-14 lg:py-16">
        <div className="relative max-w-md">
          <Logo className="h-10 text-foreground" />
          <p className="mt-8 text-xs font-semibold tracking-[0.16em] text-muted-foreground uppercase">
            Impact One · IOC
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Management desk
          </h1>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Read-only pilot for projects, deadlines, IOC consultants, and the tools already named in the brief. Nothing
            is posted or deleted in Slack, ClickUp, Drive, or Calendar.
          </p>
          <ul className="mt-8 grid list-none gap-3 p-0 text-sm text-foreground">
            {[
              "Role-based views for executive, manager, consultant, and viewer.",
              "Sample data stays labelled until read-only tokens are connected.",
              "Session cookie is httpOnly. The page never stores the token.",
            ].map((point) => (
              <li key={point} className="border-l-2 border-primary/40 pl-3 leading-6 text-muted-foreground">
                <span className="text-foreground">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="flex items-center justify-center bg-background px-4 py-10">
        <Card className="w-full max-w-md border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>
              Local pilot accounts only. Use the demo password from the project README.
            </CardDescription>
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
            <fieldset className="mt-6 grid gap-2 border-0 p-0">
              <legend className="text-sm font-medium">Pilot accounts</legend>
              <ul className="grid list-none gap-2 p-0">
                {accounts.map((account) => {
                  const selected = email === account.email;
                  return (
                    <li key={account.email}>
                      <Button
                        type="button"
                        variant="outline"
                        aria-pressed={selected}
                        className="h-auto w-full justify-between px-3 py-3 text-start aria-pressed:border-primary aria-pressed:bg-accent"
                        onClick={() => setEmail(account.email)}
                      >
                        <span className="grid">
                          <span className="font-medium">{account.name}</span>
                          <span className="text-xs font-normal text-muted-foreground">{account.email}</span>
                        </span>
                        <Badge variant="secondary">{account.role}</Badge>
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </fieldset>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
