import { authClient } from "@/lib/auth-client";
import styles from "./auth-buttons.module.css";

export function AuthButtons() {
    const handleGoogleSignIn = async () => {
        await authClient.signIn.social({ provider: "google" });
    };
    return (
        <button type="button" className="btn btn-filled btn-lg" onClick={handleGoogleSignIn}>
            <span className={styles.logo}>
                <img src="/google.png" alt="" width={22} height={22} />
            </span>
            Sign in to host
        </button>
    );
}
