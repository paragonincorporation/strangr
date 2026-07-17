import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), "");
  if (environment.VERCEL === "1") {
    const missing = [
      "VITE_API_URL",
      "VITE_SUPABASE_URL",
      "VITE_SUPABASE_ANON_KEY",
      "VITE_DEPLOYMENT_ENVIRONMENT",
    ].filter((key) => !environment[key]);
    if (missing.length)
      throw new Error(
        `Missing required Vercel environment variables: ${missing.join(", ")}`,
      );
  }
  return {
    plugins: [react()],
    server: {
      port: Number(process.env.WEB_PORT || 5173),
      strictPort: true,
    },
  };
});
