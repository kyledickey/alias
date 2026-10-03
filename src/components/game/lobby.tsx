import { Authenticated, useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";
import { GameHeader } from "@/components/game-header";
import { Icon } from "@/components/icon";
import { QrCode } from "@/components/qr-code";
import { Shape } from "@/components/shape";
import { authClient } from "@/lib/auth-client";
import { enterFullscreen } from "@/lib/fullscreen";
import { hueForCode } from "@/lib/theme";
import { HostActions, MysteryShapes } from "./lobby-parts";
import styles from "./lobby.module.css";
import { PresentView } from "./present-view";

export default function Lobby({ id }: { id: string }) {
    const game = useQuery(api.games.getGame, { code: id });
    const user = authClient.useSession();
    const addAlias = useMutation(api.games.addAlias);
    const updateGameState = useMutation(api.games.updateGameState);
    const [alias, setAlias] = useState("");
    const [presenting, setPresenting] = useState(false);
    const stopPresenting = useCallback(() => setPresenting(false), []);
    if (!game) return null;

    const joinUrl = `${window.location.origin}/game/${game.code}`;
    const isHost = user.data?.user?.id === game.hostId;
    const count = game.aliases.length;
    const baseHue = hueForCode(id);
    const startRound = () => updateGameState({ code: id, state: "active" });
    const closeLobby = () => updateGameState({ code: id, state: "inactive" });

    return (
        <div className={styles.page}>
            <GameHeader back>
                <span className="chip">Round {game.round}</span>
            </GameHeader>

            <main className={styles.main}>
                <section className={`${styles.invite} enter`}>
                    <Shape
                        shape="cookie12"
                        spin={70}
                        color="var(--primary)"
                        className={styles.inviteDecor}
                    />
                    <div className={styles.codeBlock}>
                        <p className={styles.inviteLabel}>
                            Join at <strong>{window.location.host}</strong> with code
                        </p>
                        <p className={`code ${styles.code}`}>{game.code}</p>
                    </div>
                    <div className={styles.qr}>
                        <QrCode value={joinUrl} />
                    </div>
                    <button
                        type="button"
                        aria-label="Show join screen full screen"
                        title="Present on a TV or shared screen"
                        className={`btn btn-icon ${styles.presentBtn}`}
                        onClick={() => {
                            enterFullscreen();
                            setPresenting(true);
                        }}
                    >
                        <Icon name="fullscreen" />
                    </button>
                </section>

                <section className={styles.side}>
                    <div className={`${styles.prompt} enter`} style={{ animationDelay: "100ms" }}>
                        <h1 className={`headline ${styles.title}`}>Who are you tonight?</h1>
                        <p className={styles.subtitle}>
                            Everyone enter your alias below, then the host starts the game.
                        </p>
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                const trimmed = alias.trim();
                                if (!trimmed) return;
                                await addAlias({ code: game.code, alias: trimmed });
                                setAlias("");
                                toast.success("Done! Your alias has been added.");
                            }}
                        >
                            <label className="field">
                                <input
                                    placeholder="Your alias"
                                    aria-label="Your alias"
                                    value={alias}
                                    onChange={(e) => setAlias(e.target.value)}
                                    autoComplete="off"
                                />
                                <button
                                    type="submit"
                                    aria-label="Submit alias"
                                    className="btn btn-filled btn-icon"
                                    disabled={!alias.trim()}
                                >
                                    <Icon name="check" />
                                </button>
                            </label>
                        </form>
                    </div>

                    <div className={`${styles.players} enter`} style={{ animationDelay: "180ms" }}>
                        <p className={styles.count}>
                            <span className={styles.countNum}>{count}</span>
                            <span className={styles.countLabel}>
                                {count === 1 ? "alias in" : "aliases in"}
                            </span>
                        </p>
                        {count > 0 ? (
                            <MysteryShapes aliases={game.aliases} baseHue={baseHue} />
                        ) : (
                            <p className={styles.empty}>No one yet. Be the first!</p>
                        )}
                    </div>

                    <Authenticated>
                        {isHost && (
                            <HostActions
                                canStart={count >= 2}
                                onStart={startRound}
                                onClose={closeLobby}
                            />
                        )}
                        {!isHost && count < 2 && (
                            <p className={styles.empty}>At least 2 aliases are required to start</p>
                        )}
                    </Authenticated>
                </section>
            </main>

            {presenting && (
                <PresentView
                    code={game.code}
                    joinUrl={joinUrl}
                    aliases={game.aliases}
                    baseHue={baseHue}
                    isHost={isHost}
                    onStart={startRound}
                    onClose={closeLobby}
                    onExit={stopPresenting}
                />
            )}
        </div>
    );
}
