import { useMutation } from "convex/react";
import { useState } from "react";
import { useLocation } from "wouter";
import { api } from "@convex/_generated/api";
import { Icon } from "@/components/icon";

export default function CreateGameButton() {
    const [, navigate] = useLocation();
    const createGame = useMutation(api.games.createGame);
    const [pending, setPending] = useState(false);

    return (
        <button
            type="button"
            className="btn btn-filled btn-lg"
            disabled={pending}
            onClick={async () => {
                setPending(true);
                try {
                    const code = await createGame();
                    if (code) {
                        navigate(`/game/${code}`);
                    }
                } finally {
                    setPending(false);
                }
            }}
        >
            <Icon name="celebration" filled />
            Start a game
        </button>
    );
}
