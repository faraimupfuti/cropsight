/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F6F5EF",
        surface: "#FFFFFF",
        ink: "#15180F",
        inksoft: "#4A4E42",
        forest: "#006838",
        forestdeep: "#003D21",
        foresttint: "#E6EFE6",
        moss: "#7C8B72",
        amber: "#C2790E",
        ambertint: "#FBF0DD",
        red: "#AA3626",
        redtint: "#FAEAE6",
        blue: "#2A5C8A",
        bluetint: "#E9F0F6",
        line: "#E2E0D4",
      },
      fontFamily: {
        sans: ["'IBM Plex Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xl2: "14px",
      },
    },
  },
  plugins: [],
};
