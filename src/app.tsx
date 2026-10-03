import { type AuthClient, ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { Toaster } from "sonner";
import { Redirect, Route, Switch } from "wouter";
import { Icon } from "@/components/icon";
import { authClient } from "@/lib/auth-client";
import GamePage from "@/pages/game";
import Home from "@/pages/home";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL ?? "");

// Type-only cast: better-auth >=1.6.18 renamed its client return types and
// @convex-dev/better-auth's AuthClient no longer matches them. Runtime is
// unaffected. Remove once https://github.com/get-convex/better-auth/issues/420
// is fixed.
const convexAuthClient = authClient as unknown as AuthClient;

export function App() {
    return (
        <ConvexBetterAuthProvider client={convex} authClient={convexAuthClient}>
            <Switch>
                <Route path="/" component={Home} />
                <Route path="/game/:id">{({ id }) => <GamePage key={id} id={id} />}</Route>
                <Route>
                    <Redirect to="/" replace />
                </Route>
            </Switch>
            <Toaster
                position="bottom-center"
                offset={24}
                icons={{
                    success: <Icon name="check_circle" filled />,
                    error: <Icon name="error" filled />,
                }}
                toastOptions={{
                    unstyled: true,
                    classNames: {
                        toast: "snackbar",
                        icon: "snackbar-icon",
                        title: "snackbar-title",
                        error: "snackbar-error",
                    },
                }}
            />
        </ConvexBetterAuthProvider>
    );
}
