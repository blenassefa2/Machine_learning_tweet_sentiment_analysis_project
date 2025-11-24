import { Box } from '@mui/material';
import { keyframes } from '@emotion/react';

const primaryColor = '#646cff44'; // Very subtle dark blue with low opacity

// Bouncing ball animation
const bounce = keyframes`
  0%, 100% {
    transform: translateY(0) translateX(0);
  }
  25% {
    transform: translateY(-100px) translateX(50px);
  }
  50% {
    transform: translateY(0) translateX(100px);
  }
  75% {
    transform: translateY(-100px) translateX(50px);
  }
`;

const bounceSlow = keyframes`
  0%, 100% {
    transform: translateY(0) translateX(0);
  }
  33% {
    transform: translateY(-150px) translateX(-80px);
  }
  66% {
    transform: translateY(0) translateX(-160px);
  }
`;

const bounceReverse = keyframes`
  0%, 100% {
    transform: translateY(0) translateX(0);
  }
  25% {
    transform: translateY(-120px) translateX(-40px);
  }
  50% {
    transform: translateY(0) translateX(-80px);
  }
  75% {
    transform: translateY(-120px) translateX(-40px);
  }
`;

const BackgroundAnimation = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        backgroundColor: '#0d0d0f',
        backgroundImage: 'none',
      }}
    >
      {/* Bouncing Balls - Made Bigger */}
      <Box
        sx={{
          position: 'absolute',
          top: '20%',
          left: '10%',
          width: 16,
          height: 16,
          borderRadius: '50%',
          backgroundColor: primaryColor,
          animation: `${bounce} 15s ease-in-out infinite`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '40%',
          right: '15%',
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: primaryColor,
          animation: `${bounceSlow} 20s ease-in-out infinite`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '60%',
          left: '20%',
          width: 18,
          height: 18,
          borderRadius: '50%',
          backgroundColor: primaryColor,
          animation: `${bounceReverse} 18s ease-in-out infinite`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '30%',
          right: '30%',
          width: 15,
          height: 15,
          borderRadius: '50%',
          backgroundColor: primaryColor,
          animation: `${bounce} 22s ease-in-out infinite`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '70%',
          left: '50%',
          width: 12,
          height: 12,
          borderRadius: '50%',
          backgroundColor: primaryColor,
          animation: `${bounceSlow} 25s ease-in-out infinite`,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: '80%',
          right: '25%',
          width: 17,
          height: 17,
          borderRadius: '50%',
          backgroundColor: primaryColor,
          animation: `${bounceReverse} 17s ease-in-out infinite`,
        }}
      />

      {/* Static Lines for 3D Effect - No Animation - Very Subtle */}
      {/* <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: '15%',
          width: 1,
          height: '100%',
          backgroundColor: primaryColor,
          opacity: 0.15,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: '35%',
          width: 1,
          height: '100%',
          backgroundColor: primaryColor,
          opacity: 0.15,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: '55%',
          width: 1,
          height: '100%',
          backgroundColor: primaryColor,
          opacity: 0.15,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: '75%',
          width: 1,
          height: '100%',
          backgroundColor: primaryColor,
          opacity: 0.15,
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: '90%',
          width: 1,
          height: '100%',
          backgroundColor: primaryColor,
          opacity: 0.15,
        }}
      />*/}
    </Box> 
  );
};

export default BackgroundAnimation;
