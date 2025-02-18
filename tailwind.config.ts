import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))"
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          50: "#FFF8ED",
          100: "#FFEBD0",
          200: "#FFD7A2",
          300: "#FFC273",
          400: "#FFAE45",
          500: "#FF9A17",
          600: "#DB7F0B",
          700: "#A56108",
          800: "#7E4906",
          900: "#593205"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          50: "hsl(220, 10%, 98%)",
          100: "hsl(220, 10%, 90%)",
          200: "hsl(220, 10%, 80%)",
          300: "hsl(220, 10%, 70%)",
          400: "hsl(220, 10%, 60%)",
          500: "hsl(220, 10%, 50%)",
          600: "hsl(220, 10%, 40%)",
          700: "hsl(220, 10%, 30%)",
          800: "hsl(220, 10%, 20%)",
          900: "hsl(220, 10%, 10%)"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          '1': "hsl(var(--chart-1))",
          '2': "hsl(var(--chart-2))",
          '3': "hsl(var(--chart-3))",
          '4': "hsl(var(--chart-4))",
          '5': "hsl(var(--chart-5))"
        },
        orange: {
          50: "#FFF8ED",
          100: "#FFEBD0",
          200: "#FFD7A2",
          300: "#FFC273",
          400: "#FFAE45",
          500: "#FF9A17",
          600: "#DB7F0B",
          700: "#A56108",
          800: "#7E4906",
          900: "#593205"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  darkMode: "class",
  plugins: []
};

export default config;