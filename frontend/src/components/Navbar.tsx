import { AppBar, Toolbar, Typography, Button, Box, useMediaQuery, useTheme } from '@mui/material';

import { keyframes } from '@emotion/react';


const slideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Navbar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: '#0d0d0f',
        boxShadow: 'none',
        animation: `${slideDown} 0.6s ease-out`,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, md: 4 }, flexWrap: 'wrap' }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            transition: 'transform 0.3s ease',
            '&:hover': {
              transform: 'scale(1.05)',
            },
          }}
        >
          <Box
            component="img"
            src="./BrainIconBright.png"
            sx={{
              width: 20,         // or whatever size you want
              height: 20,
              transition: 'transform 0.3s ease',
              '&:hover': {
                transform: 'rotate(360deg)',
              },
            }}
          />
          <Typography variant="h6" component="div" sx={{ fontWeight: 600 }}>
            ML Pipeline Studio
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: { xs: 1, md: 3 }, alignItems: 'center', flexWrap: 'wrap' }}>
          {!isMobile && (
            <>
              <Button
                color="inherit"
                sx={{
                  textTransform: 'none',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    color: '#646cff',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                Documentation
              </Button>
              
              
            </>
          )}
          <Button
            onClick={() => {
              window.location.href = '/#file-upload';
            }}
            variant="contained"
            sx={{
              backgroundColor: '#fff',
              color: '#000',
              textTransform: 'none',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: '#f0f0f0',
                transform: 'scale(1.05)',
                boxShadow: '0 4px 12px rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            Start
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
