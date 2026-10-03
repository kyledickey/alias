import styles from "./footer.module.css";

export default function Footer() {
    return (
        <footer className={styles.footer}>
            <span>&copy; {new Date().getFullYear()} Kyle Dickey</span>
            <a href="https://github.com/dickeyy/alias" target="_blank" rel="noopener noreferrer">
                GitHub
            </a>
        </footer>
    );
}
