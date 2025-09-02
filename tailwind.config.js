/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // Web3 Dark Theme Colors
        primary: {
          50: '#f3f0ff',
          100: '#e9e3ff',
          200: '#d6ccff',
          300: '#b8a6ff',
          400: '#9b59ff', // Main neon purple
          500: '#8b3dff',
          600: '#7c2dff',
          700: '#6d1bff',
          800: '#5e0aff',
          900: '#4f00ff',
          950: '#2d0066',
        },
        secondary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#00ffd1', // Neon cyan
          600: '#00e6bc',
          700: '#00cc9f',
          800: '#00b382',
          900: '#009965',
          950: '#00664d',
        },
        accent: {
          50: '#fef7ff',
          100: '#fceeff',
          200: '#f8ddff',
          300: '#f2bbff',
          400: '#e888ff',
          500: '#ff00ff', // Hot neon pink
          600: '#e600e6',
          700: '#cc00cc',
          800: '#b300b3',
          900: '#990099',
          950: '#660066',
        },
        electric: {
          50: '#f0f4ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#b026ff', // Electric violet
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6d28d9',
          900: '#5b21b6',
          950: '#4c1d95',
        },
        // Dark backgrounds
        dark: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#121212', // Secondary black
          950: '#0a0a0a', // Deep black
        },
        // Panel backgrounds
        panel: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e1e2e', // Dark purple-gray panels
          900: '#1a1a2e',
          950: '#16213e',
        },
        // Legacy colors for compatibility
        gray: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        error: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Orbitron', 'Inter', 'system-ui', 'sans-serif'], // Futuristic display font
        heading: ['Exo 2', 'Inter', 'system-ui', 'sans-serif'], // Modern heading font
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        '7xl': ['4.5rem', { lineHeight: '1' }],
        '8xl': ['6rem', { lineHeight: '1' }],
        '9xl': ['8rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.3), 0 10px 20px -2px rgba(0, 0, 0, 0.2)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.5), 0 20px 25px -5px rgba(0, 0, 0, 0.3)',
        'glow': '0 0 20px rgba(155, 89, 255, 0.3)',
        'glow-lg': '0 0 40px rgba(155, 89, 255, 0.4)',
        'glow-cyan': '0 0 20px rgba(0, 255, 209, 0.3)',
        'glow-pink': '0 0 20px rgba(255, 0, 255, 0.3)',
        'glow-violet': '0 0 20px rgba(176, 38, 255, 0.3)',
        'neon': '0 0 5px rgba(155, 89, 255, 0.8), 0 0 10px rgba(155, 89, 255, 0.6), 0 0 15px rgba(155, 89, 255, 0.4)',
        'neon-cyan': '0 0 5px rgba(0, 255, 209, 0.8), 0 0 10px rgba(0, 255, 209, 0.6), 0 0 15px rgba(0, 255, 209, 0.4)',
        'neon-pink': '0 0 5px rgba(255, 0, 255, 0.8), 0 0 10px rgba(255, 0, 255, 0.6), 0 0 15px rgba(255, 0, 255, 0.4)',
        'inner-glow': 'inset 0 0 20px rgba(155, 89, 255, 0.2)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.5s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-in-left': 'slideInLeft 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-gentle': 'bounceGentle 2s infinite',
        'pulse-gentle': 'pulseGentle 2s infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'neon-flicker': 'neonFlicker 0.15s ease-in-out infinite alternate',
        'matrix-rain': 'matrixRain 20s linear infinite',
        'cyber-scan': 'cyberScan 3s ease-in-out infinite',
        'hologram': 'hologram 4s ease-in-out infinite',
        'data-stream': 'dataStream 2s linear infinite',
        'circuit-pulse': 'circuitPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        pulseGentle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glowPulse: {
          '0%, 100%': { 
            boxShadow: '0 0 20px rgba(155, 89, 255, 0.3), 0 0 40px rgba(155, 89, 255, 0.1)' 
          },
          '50%': { 
            boxShadow: '0 0 30px rgba(155, 89, 255, 0.6), 0 0 60px rgba(155, 89, 255, 0.3)' 
          },
        },
        neonFlicker: {
          '0%, 100%': { 
            opacity: '1',
            textShadow: '0 0 5px rgba(155, 89, 255, 0.8), 0 0 10px rgba(155, 89, 255, 0.6)'
          },
          '50%': { 
            opacity: '0.8',
            textShadow: '0 0 2px rgba(155, 89, 255, 0.4), 0 0 5px rgba(155, 89, 255, 0.2)'
          },
        },
        matrixRain: {
          '0%': { transform: 'translateY(-100vh)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        cyberScan: {
          '0%': { 
            transform: 'translateX(-100%)',
            opacity: '0'
          },
          '50%': { 
            opacity: '1'
          },
          '100%': { 
            transform: 'translateX(100%)',
            opacity: '0'
          },
        },
        hologram: {
          '0%, 100%': { 
            opacity: '0.8',
            transform: 'translateY(0px) scale(1)',
            filter: 'hue-rotate(0deg)'
          },
          '25%': { 
            opacity: '0.6',
            transform: 'translateY(-2px) scale(1.02)',
            filter: 'hue-rotate(90deg)'
          },
          '50%': { 
            opacity: '0.9',
            transform: 'translateY(0px) scale(1)',
            filter: 'hue-rotate(180deg)'
          },
          '75%': { 
            opacity: '0.7',
            transform: 'translateY(2px) scale(0.98)',
            filter: 'hue-rotate(270deg)'
          },
        },
        dataStream: {
          '0%': { 
            transform: 'translateY(-100%)',
            opacity: '0'
          },
          '10%': { 
            opacity: '1'
          },
          '90%': { 
            opacity: '1'
          },
          '100%': { 
            transform: 'translateY(100%)',
            opacity: '0'
          },
        },
        circuitPulse: {
          '0%, 100%': { 
            strokeDashoffset: '0',
            opacity: '1'
          },
          '50%': { 
            strokeDashoffset: '20',
            opacity: '0.7'
          },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
    },
  },
  safelist: ['bg-gray-50'],
  plugins: [],
}