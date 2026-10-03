import type { ReactNode } from "react";
import { Link } from "wouter";
import { Icon } from "./icon";
import { Wordmark } from "./wordmark";
import styles from "./game-header.module.css";

export function GameHeader({ back = false, children }: { back?: boolean; children?: ReactNode }) {
    return (
        <header className={styles.header}>
            <div className={styles.side}>
                {back && (
                    <Link href="/" aria-label="Back home" className="btn btn-tonal btn-icon-sm">
                        <Icon name="arrow_back" />
                    </Link>
                )}
                <Wordmark />
            </div>
            {children && <div className={styles.side}>{children}</div>}
        </header>
    );
}
