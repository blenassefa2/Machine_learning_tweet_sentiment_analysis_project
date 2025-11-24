import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Container,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { keyframes } from '@emotion/react';

const primaryColor = '#646cff';

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

const FileUpload = () => {
  const [isDragging, setIsDragging] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Handle file drop here
    console.log('Files dropped:', e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      console.log('Files selected:', e.target.files);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 6, md: 10 },
      }}
    >
      <Container maxWidth="lg" sx={{ width: '100%' }}>
        <Box sx={{ mb: 4 }}>
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            component="h2"
            sx={{
              fontWeight: 600,
              mb: 1,
              color: '#fff',
              textAlign: 'center',
              animation: `${fadeInUp} 0.8s ease-out`,
            }}
          >
            File Upload Center
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#ccc',
              mb: 3,
              textAlign: 'center',
              px: { xs: 2, md: 0 },
              animation: `${fadeInUp} 0.8s ease-out 0.2s both`,
            }}
          >
            Drag and drop your files or click to browse.
          </Typography>

          <Paper
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            sx={{
              p: { xs: 4, md: 6 },
              textAlign: 'center',
              backgroundColor: '#0f0f11',
              border: `1px dashed ${isDragging ? primaryColor : '#1a1a1c'}`,
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              animation: `${fadeInUp} 0.8s ease-out 0.4s both`,
              '&:hover': {
                borderColor: primaryColor,
                backgroundColor: '#111113',
                transform: 'translateY(-5px)',
                boxShadow: `0 10px 30px ${primaryColor}20`,
              },
            }}
          >
            <CloudUpload
              sx={{
                fontSize: { xs: 48, md: 64 },
                color: primaryColor,
                mb: 2,
                transition: 'transform 0.3s ease',
                animation: `${fadeInUp} 0.8s ease-out 0.6s both`,
              }}
            />
            <Typography
              variant={isMobile ? 'body1' : 'h6'}
              sx={{
                color: '#fff',
                mb: 2,
                animation: `${fadeInUp} 0.8s ease-out 0.8s both`,
              }}
            >
              Drop your files here or click to select files
            </Typography>
            <input
              type="file"
              multiple
              hidden
              id="file-upload"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.jpg,.png,.mp4,.csv,.txt"
            />
            <label htmlFor="file-upload">
              <Button
                component="span"
                variant="contained"
                sx={{
                  backgroundColor: primaryColor,
                  color: '#fff',
                  textTransform: 'none',
                  px: { xs: 3, md: 4 },
                  py: 1.5,
                  transition: 'all 0.3s ease',
                  animation: `${fadeInUp} 0.8s ease-out 1s both`,
                  '&:hover': {
                    backgroundColor: '#5058e6',
                    transform: 'scale(1.05)',
                  },
                }}
              >
                Browse Files
              </Button>
            </label>
          </Paper>

          <Typography
            variant="body2"
            sx={{
              color: '#999',
              mt: 2,
              textAlign: 'center',
              px: { xs: 2, md: 0 },
              animation: `${fadeInUp} 0.8s ease-out 1.2s both`,
            }}
          >
            Supported formats: PDF, DOC, DOCX, JPG, PNG, MP4 (Max 100MB)
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default FileUpload;
