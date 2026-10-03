// Site copy shared by the home page and the build-time SEO in vite.config.ts
// (structured data and crawler-readable HTML). Plain data only: this file is
// also imported by the Vite config, outside the app's path aliases.

export const SITE_URL = "https://alias.party";

export const TITLE = "Alias · The fake name party game · Play free online";

export const TAGLINE = "A party game about fake names and wrong guesses.";

export const DESCRIPTION =
    "Alias is a free party game where everyone picks a secret fake name and you take turns guessing who's who. Play in your browser on any phone. No app, no sign-up to join.";

export const HOW_TO_PLAY_STEPS = [
    "Gather at least 4 people. The more, the better.",
    "One person creates the game (sign-in required for the host only) and shares the game code or QR code with everyone else.",
    "No phone? No problem. Players can share a single device — you don't need to join individually.",
    "Each player thinks of an alias: a fake name of a famous person, fictional character, or someone everyone in the group knows. Make it hard to guess — think outside the box!",
    "Enter your alias into the text box and submit. Aliases are not tied to your device or account, so sharing a phone is totally fine.",
    "Once every player has submitted an alias, the host starts the game.",
    'Players take turns guessing who is behind each alias. For example: "Kyle, are you John Stamos?" — if correct, that player is out and the guesser keeps going.',
    "The last person whose alias hasn't been guessed wins.",
];

export const FAQ = [
    {
        q: "What is Alias?",
        a: "Alias is a party game about fake names and wrong guesses. Everyone secretly picks an alias (a celebrity, a fictional character, or someone your group knows) and players take turns guessing who's behind each one. The last alias standing wins.",
    },
    {
        q: "How many players do you need?",
        a: "At least 4, and it only gets better with more. There's no upper limit, and the game board fits everyone on one screen.",
    },
    {
        q: "Do players need an app or an account?",
        a: "No. Alias runs in any web browser. Only the host signs in to create a game; everyone else scans the QR code or types the game code. Players can even share one phone.",
    },
    {
        q: "Can we play it on a TV?",
        a: "Yes. The host can put the join screen full screen on a TV or a shared screen, and the game board is built to be readable from across the room.",
    },
    {
        q: "Is Alias free?",
        a: "Yes, Alias is completely free to play.",
    },
];
