import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — JusCartae" },
      {
        name: "description",
        content: "Créez votre compte joueur JusCartae pour ouvrir des boosters et échanger vos cartes.",
      },
      { property: "og:title", content: "Connexion — JusCartae" },
      { property: "og:description", content: "Accédez à votre collection de cartes juridiques." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/collection", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { username },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/collection" });
        } else {
          toast.success("Compte créé — confirmez votre adresse e-mail pour jouer.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/collection" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Connexion Google impossible pour le moment.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/collection" });
  }

  return (
    <div className="hero-gradient flex min-h-screen items-center justify-center px-4 py-12">
      <div className="surface-panel w-full max-w-md p-8">
        <div className="tricolore-rule mb-6 h-1 w-16 rounded-full" />
        <h1 className="font-display text-2xl">
          {mode === "signin" ? "Connexion" : "Créer un compte"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          1 000 crédits offerts à l'inscription.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="username">Pseudo</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Portalis"
                required
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {mode === "signin" ? "Se connecter" : "Créer mon compte"}
          </Button>
        </form>

        <Button variant="outline" className="mt-3 w-full" onClick={handleGoogle}>
          Continuer avec Google
        </Button>

        <button
          type="button"
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="mt-6 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {mode === "signin"
            ? "Pas encore de compte ? Inscrivez-vous"
            : "Déjà inscrit ? Connectez-vous"}
        </button>
      </div>
    </div>
  );
}
