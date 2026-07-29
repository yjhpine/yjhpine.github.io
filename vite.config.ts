import { defineConfig } from "vite";

function pagesBase(): string {
  const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
  if (process.env.GITHUB_ACTIONS === "true" && repository && !repository.endsWith(".github.io")) {
    return `/${repository}/`;
  }
  return "/";
}

export default defineConfig({
  base: pagesBase(),
  build: { target: "es2022", sourcemap: true },
});
