import type { Config } from "tailwindcss";
import containerQueries from "@tailwindcss/container-queries";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: { extend: {} },
  // Enables `@container` and `@sm:` / `@[380px]:` variants (component-level queries).
  plugins: [containerQueries],
};

export default config;
