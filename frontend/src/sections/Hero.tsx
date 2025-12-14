import { Box, Typography, Container, useMediaQuery, useTheme, Paper } from '@mui/material';
import { Brush, PanTool, SmartToy, TrendingUp, Psychology, AutoAwesome } from '@mui/icons-material';
import { keyframes } from '@emotion/react';

const primaryColor = '#646cff';
const primaryColorDark = '#5058e6';

// Animation keyframes
const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const slideInLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
`;

const Hero = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 4, md: 8 },
        animation: `${fadeIn} 0.6s ease-in`,
      }}
    >
      <Container maxWidth="lg" sx={{ width: '100%' }}>
        <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
          <Typography
            variant={isMobile ? 'h3' : 'h2'}
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 3,
              color: '#fff',
              fontSize: { xs: '2rem', md: '3rem' },
              animation: `${fadeInUp} 0.8s ease-out`,
            }}
          >
            Complete ML Data Pipeline
          </Typography>
          <Typography
            variant={isMobile ? 'body1' : 'h6'}
            sx={{
              color: '#ccc',
              maxWidth: '800px',
              mx: 'auto',
              lineHeight: 1.8,
              px: { xs: 2, md: 0 },
              animation: `${fadeInUp} 1s ease-out 0.2s both`,
            }}
          >
             Train models, make predictions, and explore clustering-based insights effortlessly. Full Machine learning pipeline from data cleaning to model prediction and evaluations all in one place.
          </Typography>
        </Box>

        {/* Pipeline Diagram - Horizontal Layout */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 1, sm: 2, md: 3 },
            flexWrap: isMobile ? 'wrap' : 'nowrap',
            position: 'relative',
            mt: 4,
            width: '100%',
            overflowX: { xs: 'auto', md: 'visible' },
            pb: { xs: 2, md: 0 },
            animation: `${fadeInUp} 1.2s ease-out 0.4s both`,
          }}
        >
          {/* Clean */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              animation: `${slideInLeft} 0.8s ease-out 0.6s both`,
            }}
          >
            <Box
              sx={{
                width: { xs: 60, md: 80 },
                height: { xs: 60, md: 80 },
                borderRadius: '50%',
                backgroundColor: primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `3px solid ${primaryColorDark}`,
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                  animation: `${pulse} 2s ease-in-out infinite`,
                },
              }}
            >
              <Brush sx={{ fontSize: { xs: 30, md: 40 }, color: '#fff' }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
              Clean
            </Typography>
          </Box>

          {/* Arrow */}
          {!isMobile && (
            <Box
              sx={{
                width: { xs: 20, md: 30 },
                height: 2,
                backgroundColor: primaryColor,
                animation: `${fadeIn} 1s ease-out 0.8s both`,
              }}
            />
          )}

          {/* Classify Rectangle with Manual and Auto */}
          <Paper
            sx={{
              p: { xs: 2, md: 3 },
              backgroundColor: '#0f0f11',
              border: `1px solid #1a1a1c`,
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: { xs: 1.5, md: 2 },
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: { xs: 160, md: 220 },
              animation: `${slideInLeft} 0.8s ease-out 0.8s both`,
              transition: 'transform 0.3s ease, boxShadow 0.3s ease',
              position: 'relative',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: `0 0 20px ${primaryColor}20`,
                borderColor: '#1f1f22',
              },
            }}
          >
            {/* Classify Label */}
            <Typography
              variant="body2"
              sx={{
                color: '#fff',
                fontWeight: 600,
                fontSize: { xs: '0.75rem', md: '0.875rem' },
                textTransform: 'uppercase',
                letterSpacing: 1,
                mb: 0.5,
              }}
            >
              Classify
            </Typography>

            {/* Divider */}
            <Box
              sx={{
                width: '80%',
                height: 1,
                backgroundColor: primaryColor,
                opacity: 0.5,
              }}
            />

            {/* Manual and Auto */}
            <Box
              sx={{
                display: 'flex',
                gap: { xs: 2, md: 3 },
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Manual */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: { xs: 50, md: 60 },
                    height: { xs: 50, md: 60 },
                    borderRadius: '50%',
                    backgroundColor: primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${primaryColorDark}`,
                  }}
                >
                  <PanTool sx={{ fontSize: { xs: 25, md: 30 }, color: '#fff' }} />
                </Box>
                <Typography variant="body2" sx={{ color: '#fff', fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                  Manual
                </Typography>
              </Box>

              {/* Auto */}
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                  },
                }}
              >
                <Box
                  sx={{
                    width: { xs: 50, md: 60 },
                    height: { xs: 50, md: 60 },
                    borderRadius: '50%',
                    backgroundColor: primaryColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${primaryColorDark}`,
                  }}
                >
                  <SmartToy sx={{ fontSize: { xs: 25, md: 30 }, color: '#fff' }} />
                </Box>
                <Typography variant="body2" sx={{ color: '#fff', fontSize: { xs: '0.65rem', md: '0.75rem' } }}>
                  Auto
                </Typography>
              </Box>
            </Box>
          </Paper>

         

          {/* Arrow from Rectangle */}
          {!isMobile && (
            <Box
              sx={{
                width: { xs: 20, md: 30 },
                height: 2,
                backgroundColor: primaryColor,
                animation: `${fadeIn} 1s ease-out 1.4s both`,
              }}
            />
          )}

          {/* Evaluate */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              animation: `${slideInLeft} 0.8s ease-out 1.4s both`,
            }}
          >
            <Box
              sx={{
                width: { xs: 60, md: 80 },
                height: { xs: 60, md: 80 },
                borderRadius: '50%',
                backgroundColor: primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `3px solid ${primaryColorDark}`,
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                },
              }}
            >
              <TrendingUp sx={{ fontSize: { xs: 30, md: 40 }, color: '#fff' }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
              Evaluate
            </Typography>
          </Box>

          {/* Arrow */}
          {!isMobile && (
            <Box
              sx={{
                width: { xs: 20, md: 30 },
                height: 2,
                backgroundColor: primaryColor,
                animation: `${fadeIn} 1s ease-out 1.6s both`,
              }}
            />
          )}

          {/* Learn */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              animation: `${slideInLeft} 0.8s ease-out 1.6s both`,
            }}
          >
            <Box
              sx={{
                width: { xs: 60, md: 80 },
                height: { xs: 60, md: 80 },
                borderRadius: '50%',
                backgroundColor: primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `3px solid ${primaryColorDark}`,
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                },
              }}
            >
              <Psychology sx={{ fontSize: { xs: 30, md: 40 }, color: '#fff' }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
              Learn
            </Typography>
          </Box>

          {/* Arrow */}
          {!isMobile && (
            <Box
              sx={{
                width: { xs: 20, md: 30 },
                height: 2,
                backgroundColor: primaryColor,
                animation: `${fadeIn} 1s ease-out 1.8s both`,
              }}
            />
          )}

          {/* Predict */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 1,
              animation: `${slideInLeft} 0.8s ease-out 1.8s both`,
            }}
          >
            <Box
              sx={{
                width: { xs: 60, md: 80 },
                height: { xs: 60, md: 80 },
                borderRadius: '50%',
                backgroundColor: primaryColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `3px solid ${primaryColorDark}`,
                transition: 'transform 0.3s ease',
                '&:hover': {
                  transform: 'scale(1.1)',
                },
              }}
            >
              <AutoAwesome sx={{ fontSize: { xs: 30, md: 40 }, color: '#fff' }} />
            </Box>
            <Typography variant="body2" sx={{ color: '#fff', fontWeight: 500, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
              Predict
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Hero;
