import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "login-vignette":
          "radial-gradient(ellipse at 50% 40%, rgba(120, 30, 20, 0.25) 0%, rgba(10, 10, 10, 0.95) 70%, #0a0a0a 100%)",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        fables: {
          "primary": "#d4af37",
          "primary-content": "#0a0a0a",
          "secondary": "#8b1a1a",
          "secondary-content": "#f0e6c8",
          "accent": "#e6c44c",
          "accent-content": "#0a0a0a",
          "neutral": "#1a1a1a",
          "neutral-content": "#d4c9a8",
          "base-100": "#0a0a0a",
          "base-200": "#1a1a1a",
          "base-300": "#2a2a2a",
          "base-content": "#d4c9a8",
          "info": "#3b82f6",
          "success": "#22c55e",
          "warning": "#d4af37",
          "error": "#dc2626",
        },
      },
    ],
  },
};
export default config;
