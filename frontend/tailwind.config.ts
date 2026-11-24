import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        rural: {
          bg: "#faf6ef",
          card: "#ffffff",
          sand: "#f4ede2",
          sandDark: "#e5dac9",
          soil: "#4a3321",
          soilLight: "#78583e",
          terracotta: "#b84727",
          clay: "#943b1f",
          wheat: "#e69b00",
          wheatLight: "#fef3c7",
          crop: "#1b6928",
          leaf: "#2e7d32",
          accent: "#d97706",
        },
        soil: {
          50: "#fdf8f5",
          100: "#f5eee6",
          200: "#e8dac9",
          500: "#996b42",
          700: "#5c3d23",
          900: "#382313",
        },
      },
      boxShadow: {
        tactile: "0 4px 0 0 rgba(74, 51, 33, 0.2)",
        tactileActive: "0 1px 0 0 rgba(74, 51, 33, 0.2)",
        rural: "0 10px 25px -5px rgba(74, 51, 33, 0.08), 0 8px 10px -6px rgba(74, 51, 33, 0.05)",
      },
    },
  },
  plugins: [],
} satisfies Config;
