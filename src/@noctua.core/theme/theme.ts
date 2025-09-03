import createTheme from '@mui/material/styles/createTheme'
import { componentThemes } from '.'

export const noctuaColors = {
  noctuadark: {
    50: '#e4e7ec',
    100: '#bbc3d0',
    200: '#8e9bb0',
    300: '#627491',
    400: '#3f567b',
    500: '#173672',
    600: '#132f64',
    700: '#102653',
    800: '#0c1d42',
    900: '#08142f',
  },
  noctuaAccent: {
    50: '#fdf8e7',
    100: '#f9edc3',
    200: '#f5e19b',
    300: '#f1d572',
    400: '#eecc54',
    500: '#ebc336',
    600: '#e9bd30',
    700: '#e5b529',
    800: '#e2ae22',
    900: '#dda116',
  },
}

const baseTheme = createTheme({
  palette: {
    primary: {
      main: noctuaColors.noctuadark[500],
      light: noctuaColors.noctuadark[300],
      dark: noctuaColors.noctuadark[700],
    },
    secondary: {
      main: noctuaColors.noctuaAccent[600],
      light: noctuaColors.noctuaAccent[400],
      dark: noctuaColors.noctuaAccent[800],
    },
  },
  typography: {
    fontSize: 14,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
  },
})

const theme = createTheme(baseTheme, {
  components: componentThemes(baseTheme),
})

export default theme
