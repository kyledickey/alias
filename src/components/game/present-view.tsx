import type { Infer } from "convex/values";
import { useEffect } from "react";
import type { aliasSchema } from "@convex/schema";
import { Icon } from "@/components/icon";
import { QrCode } from "@/components/qr-code";
import { Shape } from "@/components/shape";
import { Wordmark } from "@/components/wordmark";
import { exitFullscreen } from "@/lib/fullscreen";
import { HostActions, MysteryShapes } from "./lobby-parts";
import styles from "./present-view.module.css";

/**
 * Projector / screen-share view of the lobby: just the join info, a huge QR,
 * and (for the host) start/close. No alias input, so nobody types on the TV.
 */
export function PresentView({
    code,
    joinUrl,
    aliases,
    baseHue,
    isHost,
    onStart,
    onClose,
    onExit,
}: {
    code: string;
    joinUrl: string;
    aliases: Infer<typeof aliasSchema>[];
    baseHue: number;
    isHost: boolean;
    onStart: () => void;
    onClose: () => void;
    onExit: () => void;
}) {
    // Leaving browser fullscreen (Esc) also leaves the view. We deliberately
    // don't exit fullscreen on unmount: starting the round should flow
    // straight into the full-screen game board.
    useEffect(() => {
        let wasFullscreen = !!document.fullscreenElement;
        const onChange = () => {
            if (wasFullscreen && !document.fullscreenElement) onExit();
            wasFullscreen = !!document.fullscreenElement;
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onExit();
        };
        document.addEventListener("fullscreenchange", onChange);
        window.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("fullscreenchange", onChange);
            window.removeEventListener("keydown", onKey);
        };
    }, [onExit]);

    const count = aliases.length;

    return (
        <div className={styles.overlay} role="dialog" aria-modal aria-label="Join screen">
            <Shape shape="cookie12" spin={80} color="var(--primary)" className={styles.decor} />

            <button
                type="button"
                aria-label="Exit full screen"
                className={`btn btn-icon ${styles.exit}`}
                onClick={() => {
                    exitFullscreen();
                    onExit();
                }}
            >
                <Icon name="fullscreen_exit" />
            </button>

            <div className={styles.info}>
                <Wordmark />
                <div>
                    <p className={styles.label}>Join at</p>
                    <p className={`headline ${styles.host}`}>{window.location.host}</p>
                </div>
                <div>
                    <p className={styles.label}>with code</p>
                    <p className={`code ${styles.code}`}>{code}</p>
                </div>

                <div className={styles.players}>
                    <p className={styles.count}>
                        <span className={styles.countNum}>{count}</span>
                        {count === 1 ? "alias in" : "aliases in"}
                    </p>
                    <MysteryShapes aliases={aliases} baseHue={baseHue} className={styles.shapes} />
                </div>

                {isHost && (
                    <HostActions
                        canStart={count >= 2}
                        onStart={onStart}
                        onClose={() => {
                            exitFullscreen();
                            onClose();
                        }}
                        className={styles.actions}
                    />
                )}
            </div>

            <div className={styles.qr}>
                <QrCode value={joinUrl} />
            </div>
        </div>
    );
}
