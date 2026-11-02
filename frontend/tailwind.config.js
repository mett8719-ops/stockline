/**
 * Configuration Tailwind — reprend la palette exacte des maquettes.
 *
 * DEUX PALETTES DISTINCTES :
 *   `brand`    (bleu)   → espace boutique et site public
 *   `platform` (violet) → console Super-Admin
 *
 * Cette distinction visuelle est volontaire : un administrateur qui passe
 * d'un espace a l'autre voit immediatement ou il se trouve.
 */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Espace boutique et public
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",   // couleur principale des maquettes
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
        },
        // Console Super-Admin
        platform: {
          50: "#faf5ff",
          100: "#f3e8ff",
          400: "#c084fc",
          500: "#a855f7",
          600: "#9333ea",   // violet des maquettes admin
          700: "#7e22ce",
          900: "#581c87",
          950: "#1e1b3a",   // fond de la sidebar admin
        },
        // Fond sombre de la sidebar boutique
        sidebar: {
          DEFAULT: "#0f172a",
          hover: "#1e293b",
        },
        // Statuts métier
        success: "#16a34a",
        warning: "#f59e0b",
        danger: "#dc2626",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["'Courier New'", "monospace"],
      },
      borderRadius: {
        card: "12px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)",
        modal: "0 20px 40px rgba(0,0,0,0.15)",
      },
      animation: {
        "slide-up": "slideUp 0.2s ease-out",
        "fade-in": "fadeIn 0.15s ease-out",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(8px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
