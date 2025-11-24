import { Box, Typography, IconButton, useMediaQuery, useTheme } from '@mui/material';
import { GitHub, Twitter, LinkedIn } from '@mui/icons-material';
import { keyframes } from '@emotion/react';

const primaryColor = '#646cff';

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Footer = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        backgroundColor: '#0d0d0f',
        py: 4,
        px: { xs: 2, md: 4 },
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: { xs: 2, md: 0 },
        borderTop: '1px solid #1a1a1c',
        animation: `${fadeInUp} 0.8s ease-out`,
      }}
    >
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: { xs: 'center', md: 'left' } }}>
        © 2025 ML Pipeline Studio. All rights reserved.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <IconButton
          color="inherit"
          sx={{
            color: '#fff',
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: '#1a1a1c',
              color: primaryColor,
              transform: 'translateY(-3px) scale(1.1)',
            },
          }}
        >
          <GitHub />
        </IconButton>
        <IconButton
          color="inherit"
          sx={{
            color: '#fff',
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: '#1a1a1c',
              color: primaryColor,
              transform: 'translateY(-3px) scale(1.1)',
            },
          }}
        >
          <Twitter />
        </IconButton>
        <IconButton
          color="inherit"
          sx={{
            color: '#fff',
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: '#1a1a1c',
              color: primaryColor,
              transform: 'translateY(-3px) scale(1.1)',
            },
          }}
        >
          <LinkedIn />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Footer;
