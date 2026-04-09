import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Tenant-aware primary — set via CSS var from tenant branding
        primary: {
          DEFAULT: "var(--color-primary, #1E3A8A)",
          dark:    "var(--color-primary-dark, #152a63)",
          light:   "var(--color-primary-light, #3b5fcc)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
