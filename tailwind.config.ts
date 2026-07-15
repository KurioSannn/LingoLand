import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#F3F1FF",
          100: "#E8E4FF",
          500: "#7868F8",
          600: "#6757E8",
        },
        neutral: {
          50: "#F7F7FA",
          100: "#F1F0F4",
          200: "#E7E5EC",
          300: "#D9D7E0",
          500: "#6F6C78",
          700: "#4B4952",
          950: "#27262D",
        },
        success: {
          100: "#E8F8EF",
          500: "#35B86B",
        },
        warning: {
          100: "#FFF4D9",
          500: "#D99A24",
        },
        danger: {
          100: "#FDECEC",
          500: "#D84C4C",
        },
        info: {
          100: "#EAF2FF",
          500: "#3D78D8",
        },
        coin: "#F4C84A",
        heart: "#EC5C6C",
      },
      fontFamily: {
        sans: ["Inter", "Plus Jakarta Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
      },
      boxShadow: {
        layer: "0 8px 24px rgba(39, 38, 45, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
