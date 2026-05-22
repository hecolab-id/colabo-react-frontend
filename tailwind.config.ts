import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", ".admin-dark"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          50: "var(--primary-50)",
          100: "var(--primary-100)",
          200: "var(--primary-200)",
          300: "var(--primary-300)",
          400: "var(--primary-400)",
          500: "var(--primary-500)",
          600: "var(--primary-600)",
          700: "var(--primary-700)",
          800: "var(--primary-800)",
          900: "var(--primary-900)",
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)"
        },
        "primary-dark": "var(--primary-dark)",
        "primary-dark-hover": "var(--primary-dark-hover)",
        "primary-foreground": "var(--primary-foreground)",
        secondary: "var(--secondary)",
        "secondary-foreground": "var(--secondary-foreground)",
        accent: "var(--accent)",
        "accent-foreground": "var(--accent-foreground)",
        destructive: "var(--danger-fg)",
        "destructive-foreground": "#ffffff",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        card: "var(--card)",
        "card-foreground": "var(--card-foreground)",
        border: "var(--border)",
        input: "var(--border)",
        ring: "var(--primary)"
      },
      fontFamily: {
        sans: [
          "\"Plus Jakarta Sans\"",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif"
        ],
        mono: [
          "SF Mono",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "monospace"
        ]
      },
      boxShadow: {
        glass: "0 24px 60px rgba(15, 23, 42, 0.12)",
        float: "0 16px 40px rgba(15, 23, 42, 0.10)"
      },
      backdropBlur: {
        xl: "24px"
      }
    }
  },
  plugins: []
};

export default config;
