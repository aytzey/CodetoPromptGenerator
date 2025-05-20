// tailwind.config.js
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./views/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Enhanced color palette
        primary: {
          lighter: 'rgba(130, 155, 255, 0.2)',
          light: 'rgba(130, 155, 255, 0.5)',
          DEFAULT: 'rgb(130, 155, 255)',
          dark: 'rgb(110, 135, 235)',
        },
        secondary: {
          lighter: 'rgba(85, 255, 130, 0.2)',
          light: 'rgba(85, 255, 130, 0.5)',
          DEFAULT: 'rgb(85, 255, 130)',
          dark: 'rgb(65, 235, 110)',
        },
        tertiary: {
          lighter: 'rgba(195, 155, 255, 0.2)',
          light: 'rgba(195, 155, 255, 0.5)',
          DEFAULT: 'rgb(195, 155, 255)',
          dark: 'rgb(175, 135, 235)',
        },
        accent: {
          pink: 'rgb(255, 125, 205)',
          cyan: 'rgb(145, 240, 255)',
          yellow: 'rgb(245, 255, 145)',
          orange: 'rgb(255, 190, 115)',
        },
        // Background shades
        bg: {
          primary: 'rgb(13, 14, 33)',
          secondary: 'rgb(20, 21, 44)',
          tertiary: 'rgb(28, 29, 58)',
        },
      },
      animation: {
        'float': 'float 4s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s infinite',
        'pulse-slow': 'pulseSlow 3s infinite',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.215, 0.61, 0.355, 1)',
        'slide-in-right': 'slideInRight 0.5s cubic-bezier(0.215, 0.61, 0.355, 1)',
        'background-shift': 'backgroundShift 10s ease infinite',
      },
      boxShadow: {
        'glow-primary': '0 0 15px rgba(130, 155, 255, 0.4)',
        'glow-secondary': '0 0 15px rgba(85, 255, 130, 0.4)',
        'glow-tertiary': '0 0 15px rgba(195, 155, 255, 0.4)',
        'card': '0 10px 30px rgba(0, 0, 0, 0.15), 0 3px 10px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 15px 40px rgba(0, 0, 0, 0.2), 0 5px 15px rgba(0, 0, 0, 0.15)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-angular': 'conic-gradient(var(--tw-gradient-stops))',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      transitionDuration: {
        '400': '400ms',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-7px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        slideUp: {
          from: { transform: 'translateY(15px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        slideInRight: {
          from: { transform: 'translateX(15px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        backgroundShift: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      typography: {
        DEFAULT: {
          css: {
            maxWidth: '65ch',
            color: 'rgb(var(--color-text-primary))',
            h1: {
              color: 'rgb(var(--color-text-primary))',
            },
            h2: {
              color: 'rgb(var(--color-text-primary))',
            },
            h3: {
              color: 'rgb(var(--color-text-primary))',
            },
            h4: {
              color: 'rgb(var(--color-text-primary))',
            },
            strong: {
              color: 'rgb(var(--color-text-primary))',
            },
            a: {
              color: 'rgb(var(--color-primary))',
              '&:hover': {
                color: 'rgb(var(--color-tertiary))',
              },
            },
            code: {
              color: 'rgb(var(--color-secondary))',
              backgroundColor: 'rgba(var(--color-bg-secondary), 0.4)',
              paddingLeft: '0.25rem',
              paddingRight: '0.25rem',
              paddingTop: '0.125rem',
              paddingBottom: '0.125rem',
              borderRadius: '0.25rem',
            },
            pre: {
              backgroundColor: 'rgba(var(--color-bg-secondary), 0.7)',
              code: {
                backgroundColor: 'transparent',
              },
            },
          },
        },
      },
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(4px)',
        'blur-md': 'blur(8px)',
        'blur-lg': 'blur(12px)',
        'blur-xl': 'blur(16px)',
        'blur-2xl': 'blur(24px)',
        'blur-3xl': 'blur(32px)',
      },
    },
    fontFamily: {
      sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}