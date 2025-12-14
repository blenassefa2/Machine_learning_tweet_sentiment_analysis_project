import { Box, Typography, Container, useMediaQuery, useTheme, Paper } from '@mui/material';
import { 
  Brush, 
  PanTool, 
  SmartToy, 
  AutoAwesome, 
  ScatterPlot,
  Assessment,
  Grain,
  AccountTree,
  Hub
} from '@mui/icons-material';
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

// Reusable circle node component for main steps
const CircleNode = ({ 
  icon, 
  label, 
  size = 'medium',
  color = primaryColor,
  delay = 0 
}: { 
  icon: React.ReactNode; 
  label: string; 
  size?: 'small' | 'medium' | 'large';
  color?: string;
  delay?: number;
}) => {
  const sizes = {
    small: { circle: { xs: 40, md: 50 }, icon: { xs: 20, md: 25 }, font: { xs: '0.6rem', md: '0.7rem' } },
    medium: { circle: { xs: 50, md: 65 }, icon: { xs: 25, md: 32 }, font: { xs: '0.7rem', md: '0.8rem' } },
    large: { circle: { xs: 65, md: 85 }, icon: { xs: 32, md: 42 }, font: { xs: '0.8rem', md: '0.9rem' } },
  };
  
  const s = sizes[size];
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 0.5,
        animation: `${slideInLeft} 0.6s ease-out ${delay}s both`,
      }}
    >
      <Box
        sx={{
          width: s.circle,
          height: s.circle,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `2px solid ${color}99`,
          boxShadow: `0 4px 20px ${color}40`,
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: `0 6px 30px ${color}60`,
            animation: `${pulse} 1s ease-in-out infinite`,
          },
        }}
      >
        <Box sx={{ fontSize: s.icon, color: '#fff', display: 'flex' }}>{icon}</Box>
      </Box>
      <Typography 
        variant="body2" 
        sx={{ 
          color: '#fff', 
          fontWeight: 500, 
          fontSize: s.font,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

// Inner circle for grouped items (inverted colors - dark inside)
const InnerCircleNode = ({ 
  icon, 
  label, 
  delay = 0 
}: { 
  icon: React.ReactNode; 
  label: string; 
  delay?: number;
}) => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 0.5,
      animation: `${slideInLeft} 0.6s ease-out ${delay}s both`,
    }}
  >
    <Box
      sx={{
        width: { xs: 40, md: 50 },
        height: { xs: 40, md: 50 },
        borderRadius: '50%',
        backgroundColor: '#0a0a0c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `2px solid #1a1a1c`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'scale(1.1)',
          borderColor: '#fff',
          backgroundColor: '#151517',
        },
      }}
    >
      <Box sx={{ fontSize: { xs: 20, md: 25 }, color: '#fff', display: 'flex' }}>{icon}</Box>
    </Box>
    <Typography 
      variant="body2" 
      sx={{ 
        color: '#ccc', 
        fontWeight: 500, 
        fontSize: { xs: '0.6rem', md: '0.7rem' },
        textAlign: 'center',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </Typography>
  </Box>
);

// Arrow component
const Arrow = ({ delay = 0 }: { delay?: number }) => (
  <Box
    sx={{
      width: { xs: 20, md: 35 },
      height: 3,
      background: `linear-gradient(90deg, ${primaryColor}, ${primaryColorDark})`,
      borderRadius: 2,
      animation: `${fadeIn} 0.5s ease-out ${delay}s both`,
      position: 'relative',
      '&::after': {
        content: '""',
        position: 'absolute',
        right: -4,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 0,
        height: 0,
        borderLeft: `6px solid ${primaryColorDark}`,
        borderTop: '5px solid transparent',
        borderBottom: '5px solid transparent',
      },
    }}
  />
);

// Group box for Label and Train sections (colored box with dark circles inside)
const GroupBox = ({ 
  title, 
  children, 
  delay = 0 
}: { 
  title: string; 
  children: React.ReactNode; 
  delay?: number;
}) => (
  <Paper
    sx={{
      p: { xs: 1.5, md: 2 },
      background: `linear-gradient(135deg, ${primaryColor}20 0%, ${primaryColor}10 100%)`,
      border: `2px solid ${primaryColor}`,
      borderRadius: 3,
      display: 'flex',
      flexDirection: 'column',
      gap: 1,
      alignItems: 'center',
      animation: `${slideInLeft} 0.6s ease-out ${delay}s both`,
      transition: 'all 0.3s ease',
      boxShadow: `0 4px 20px ${primaryColor}30`,
      '&:hover': {
        boxShadow: `0 6px 30px ${primaryColor}50`,
        transform: 'translateY(-3px)',
        borderColor: primaryColorDark,
      },
    }}
  >
    <Typography
      sx={{
        color: '#fff',
        fontWeight: 700,
        fontSize: { xs: '0.75rem', md: '0.9rem' },
        textTransform: 'uppercase',
        letterSpacing: 1.5,
      }}
    >
      {title}
    </Typography>
    <Box
      sx={{
        width: '90%',
        height: 1,
        background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
      }}
    />
    <Box sx={{ display: 'flex', gap: { xs: 1, md: 1.5 }, flexWrap: 'wrap', justifyContent: 'center' }}>
      {children}
    </Box>
  </Paper>
);

const Hero = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmall = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 4, md: 8 },
        animation: `${fadeIn} 0.6s ease-in`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background decoration */}
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '150%',
          height: '150%',
          background: `radial-gradient(ellipse at center, ${primaryColor}08 0%, transparent 50%)`,
          pointerEvents: 'none',
        }}
      />
      
      <Container maxWidth="lg" sx={{ width: '100%', position: 'relative', zIndex: 1 }}>
        <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
          <Typography
            variant={isMobile ? 'h3' : 'h2'}
            component="h1"
            sx={{
              fontWeight: 700,
              mb: 3,
              color: '#fff',
              fontSize: { xs: '1.8rem', sm: '2.2rem', md: '3rem' },
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
              fontSize: { xs: '0.9rem', md: '1.1rem' },
            }}
          >
            Train models, make predictions, and explore clustering-based insights effortlessly. 
            Full Machine learning pipeline from data cleaning to model prediction and evaluations all in one place.
          </Typography>
        </Box>

        {/* Pipeline Diagram */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: { xs: 2, md: 3 },
            mt: { xs: 2, md: 4 },
            animation: `${fadeInUp} 1.2s ease-out 0.4s both`,
          }}
        >
          {/* Main Pipeline Row: Clean -> Label -> Train -> Predict -> Evaluate */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: { xs: 0.5, sm: 1, md: 2 },
              flexWrap: isSmall ? 'wrap' : 'nowrap',
              width: '100%',
            }}
          >
            {/* Clean */}
            <CircleNode 
              icon={<Brush sx={{ fontSize: 'inherit' }} />} 
              label="Clean" 
              size="large"
              delay={0.5}
            />

            {!isSmall && <Arrow delay={0.7} />}

            {/* Label Group */}
            <GroupBox title="Label" delay={0.8}>
              <InnerCircleNode 
                icon={<PanTool sx={{ fontSize: 'inherit' }} />} 
                label="Manual" 
                delay={0.9}
              />
              <InnerCircleNode 
                icon={<SmartToy sx={{ fontSize: 'inherit' }} />} 
                label="Naive Auto" 
                delay={1.0}
              />
              <InnerCircleNode 
                icon={<ScatterPlot sx={{ fontSize: 'inherit' }} />} 
                label="Clustering" 
                delay={1.1}
              />
            </GroupBox>

            {!isSmall && <Arrow delay={1.2} />}

            {/* Train Group */}
            <GroupBox title="Train" delay={1.3}>
              <InnerCircleNode 
                icon={<Hub sx={{ fontSize: 'inherit' }} />} 
                label="KNN" 
                delay={1.4}
              />
              <InnerCircleNode 
                icon={<Grain sx={{ fontSize: 'inherit' }} />} 
                label="Naive Auto" 
                delay={1.5}
              />
              <InnerCircleNode 
                icon={<AccountTree sx={{ fontSize: 'inherit' }} />} 
                label="Naive Bayes" 
                delay={1.6}
              />
            </GroupBox>

            {!isSmall && <Arrow delay={1.7} />}

            {/* Predict */}
            <CircleNode 
              icon={<AutoAwesome sx={{ fontSize: 'inherit' }} />} 
              label="Predict" 
              size="large"
              delay={1.8}
            />

            {!isSmall && <Arrow delay={1.9} />}

            {/* Evaluate */}
            <CircleNode 
              icon={<Assessment sx={{ fontSize: 'inherit' }} />} 
              label="Evaluate" 
              size="large"
              delay={2.0}
            />
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Hero;
