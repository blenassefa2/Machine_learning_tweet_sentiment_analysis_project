import { Box, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import BackgroundAnimation from './components/BackgroundAnimation';
import Hero from './sections/Hero';
import FileUpload from './sections/FileUpload';
import ConfigurationReview from './sections/ConfigurationReview';
import './App.css';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#646cff',
    },
    background: {
      default: '#0d0d0f',
      paper: '#0f0f11',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#0d0d0f !important',
          backgroundImage: 'none !important',
        },
        html: {
          backgroundColor: '#0d0d0f !important',
          backgroundImage: 'none !important',
        },
        '#root': {
          backgroundColor: '#0d0d0f !important',
          backgroundImage: 'none !important',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#0d0d0f',
          backgroundImage: 'none',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <BackgroundAnimation />
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            backgroundColor: 'transparent',
          }}
        >
          <Navbar />
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Hero />
            <FileUpload />
            <ConfigurationReview />
          </Box>
          <Footer />
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;