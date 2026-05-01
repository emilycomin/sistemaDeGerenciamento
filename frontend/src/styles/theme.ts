import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0066CC',
      light: '#3385D6',
      dark: '#0052A3',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#E8F0FF',
      light: '#F0F5FF',
      dark: '#C5D5FF',
      contrastText: '#0066CC',
    },
    background: {
      default: '#F8FAFF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A2E',
      secondary: '#6B7280',
    },
    divider: '#E9ECEF',
    success: { main: '#10B981' },
    warning: { main: '#F59E0B' },
    error: { main: '#EF4444' },
    info: { main: '#0066CC' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { lineHeight: 1.6 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    '0px 1px 3px rgba(0,102,204,0.06)',
    '0px 2px 6px rgba(0,102,204,0.08)',
    '0px 4px 12px rgba(0,102,204,0.10)',
    '0px 6px 16px rgba(0,102,204,0.12)',
    '0px 8px 24px rgba(0,102,204,0.14)',
    '0px 12px 32px rgba(0,102,204,0.16)',
    '0px 16px 40px rgba(0,102,204,0.18)',
    '0px 20px 48px rgba(0,102,204,0.20)',
    '0px 24px 56px rgba(0,102,204,0.22)',
    '0px 28px 64px rgba(0,102,204,0.24)',
    '0px 32px 72px rgba(0,102,204,0.26)',
    '0px 36px 80px rgba(0,102,204,0.28)',
    '0px 40px 88px rgba(0,102,204,0.30)',
    '0px 44px 96px rgba(0,102,204,0.32)',
    '0px 48px 104px rgba(0,102,204,0.34)',
    '0px 52px 112px rgba(0,102,204,0.36)',
    '0px 56px 120px rgba(0,102,204,0.38)',
    '0px 60px 128px rgba(0,102,204,0.40)',
    '0px 64px 136px rgba(0,102,204,0.42)',
    '0px 68px 144px rgba(0,102,204,0.44)',
    '0px 72px 152px rgba(0,102,204,0.46)',
    '0px 76px 160px rgba(0,102,204,0.48)',
    '0px 80px 168px rgba(0,102,204,0.50)',
    '0px 84px 176px rgba(0,102,204,0.52)',
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 18px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 8px rgba(0,102,204,0.20)',
            transform: 'translateY(-1px)',
          },
          transition: 'all 0.2s ease',
        },
        contained: {
          background: 'linear-gradient(135deg, #0066CC 0%, #0052A3 100%)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: '1px solid #E9ECEF',
          boxShadow: '0px 2px 6px rgba(0,102,204,0.06)',
          transition: 'all 0.25s ease',
          '&:hover': {
            boxShadow: '0px 6px 20px rgba(0,102,204,0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid #E9ECEF',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#0066CC',
            },
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          border: 'none',
          boxShadow: '2px 0 20px rgba(0,102,204,0.08)',
        },
      },
    },
  },
})
