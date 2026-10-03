import { useQuery } from "convex/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { api } from "@convex/_generated/api";
import Active from "@/components/game/active";
import Lobby from "@/components/game/lobby";
import RoundOver from "@/components/game/round-over";
import { hueForCode, playerHue, useThemeHue } from "@/lib/theme";

export default function GamePage({ id }: { id: string }) {
    const [, navigate] = useLocation();
    const game = useQuery(api.games.getGame, { code: id });

    // Every game gets its own palette; the winner screen takes the winner's color
    const baseHue = hueForCode(id);
    const winnerIndex =
        game?.state === "round_over" ? game.aliases.findIndex((a) => !a.eliminated) : -1;
    useThemeHue(winnerIndex >= 0 ? playerHue(baseHue, winnerIndex) : baseHue);

    useEffect(() => {
        if (game) document.title = pageTitle(game);
    }, [game]);

    useEffect(() => {
        if (game === undefined) return;
        if (game === null || game.state === "inactive") {
            toast.error("Game is inactive");
            navigate("/", { replace: true });
        }
    }, [game, navigate]);

    if (game === undefined) return null;
    if (game === null || game.state === "inactive") return null;

    if (game.state === "active") {
        return <Active id={id} />;
    }

    if (game.state === "round_over") {
        return <RoundOver id={id} />;
    }

    return <Lobby id={id} />;
}

function pageTitle(game: { state: string; code: string; round: number }) {
    switch (game.state) {
        case "lobby":
            return `Join game ${game.code} · Alias`;
        case "active":
            return `Round ${game.round} · ${game.code} · Alias`;
        default:
            return `Round ${game.round} over · Alias`;
    }
}
