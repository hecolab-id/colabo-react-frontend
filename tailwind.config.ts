import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", ".admin-dark"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
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
        ],
        "space-grotesk": [
          "\"Space Grotesk\"",
          "\"SF Pro Display\"",
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
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
