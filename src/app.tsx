import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexReactClient } from "convex/react";
import { Toaster } from "sonner";
import { Redirect, Route, Switch } from "wouter";
import { Icon } from "@/components/icon";
import { authClient } from "@/lib/auth-client";
import GamePage from "@/pages/game";
import Home from "@/pages/home";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL ?? "");

export function App() {
    return (
        <ConvexBetterAuthProvider client={convex} authClient={authClient}>
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
