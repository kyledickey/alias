// Railway infrastructure as code. Preview with `railway config plan`, apply
// with `railway config apply` (once the repo is linked to a Railway project).
import { defineRailway, github, preserve, project, service } from "railway/iac";

export default defineRailway(() => {
    const web = service("web", {
        source: github("kyledickey/alias", { branch: "main" }),
        // Multi-stage build: bun builds the SPA, Go embeds it in one binary
        build: { builder: "DOCKERFILE", dockerfilePath: "Dockerfile" },
        healthcheck: "/healthz",
        deploy: { restartPolicyType: "ON_FAILURE", restartPolicyMaxRetries: 10 },
        env: {
            // Runtime: the Go server proxies /api/auth here
            CONVEX_SITE_URL: preserve(),
            SITE_URL: "https://alias.party",
            // Build time: Railway passes these to the Dockerfile's ARGs
            VITE_CONVEX_URL: preserve(),
            VITE_VISITORS_TOKEN: preserve(),
        },
        domains: ["alias.party"],
    });

    return project("alias", { resources: [web] });
});
