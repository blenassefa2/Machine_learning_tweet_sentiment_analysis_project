import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { getCleaningJob } from '../api/cleaning';
import { getClassifyJob } from '../api/classify';
import { getTrainingJob } from '../api/training';

interface ProgressModalProps {
  open: boolean;
  jobId: string | null;
  jobType: 'cleaning' | 'classification' | 'training' | null;
  onClose: () => void;
  onComplete?: () => void;
}

const ProgressModal = ({ open, jobId, jobType, onClose, onComplete }: ProgressModalProps) => {
  const [status, setStatus] = useState<'pending' | 'running' | 'completed' | 'error'>('pending');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!open || !jobId || !jobType) {
      setStatus('pending');
      setErrorMessage('');
      return;
    }

    let interval: NodeJS.Timeout | null = null;
    const checkStatus = async () => {
      try {
        let response;
        if (jobType === 'cleaning') {
          response = await getCleaningJob(jobId);
        } else if (jobType === 'classification') {
          response = await getClassifyJob(jobId);
        } else if (jobType === 'training') {
          response = await getTrainingJob(jobId);
        } else {
          return;
        }

        setStatus(response.status);
        if (response.logs) setErrorMessage(response.logs);

        if (response.status === 'completed') {
          if (interval) clearInterval(interval);
          if (onComplete) onComplete();
        } else if (response.status === 'error') {
          if (interval) clearInterval(interval);
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMessage(err.message || 'An error occurred');
        if (interval) clearInterval(interval);
      }
    };

    // Initial check
    checkStatus();
    // Set up polling
    interval = setInterval(checkStatus, 1500);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [open, jobId, jobType, onComplete]);

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Job queued...';
      case 'running':
        return 'Processing...';
      case 'completed':
        return 'Completed successfully!';
      case 'error':
        return 'Error occurred';
      default:
        return 'Unknown status';
    }
  };

  const primaryColor = '#646cff';

  return (
    <Dialog
      open={open}
      onClose={status === 'completed' || status === 'error' ? onClose : undefined}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#0f0f11',
          border: '1px solid #1a1a1c',
        },
      }}
    >
      <DialogTitle sx={{ color: '#fff', fontWeight: 600 }}>
        {jobType === 'cleaning' && 'Data Cleaning'}
        {jobType === 'classification' && 'Classification'}
        {jobType === 'training' && 'Model Training'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
          {status === 'pending' || status === 'running' ? (
            <>
              <CircularProgress sx={{ color: primaryColor }} />
              <Typography sx={{ color: '#ccc' }}>{getStatusText()}</Typography>
              <LinearProgress
                sx={{
                  width: '100%',
                  height: 8,
                  borderRadius: 1,
                  backgroundColor: '#1a1a1c',
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: primaryColor,
                  },
                }}
                variant={status === 'pending' ? 'indeterminate' : 'indeterminate'}
              />
            </>
          ) : status === 'completed' ? (
            <>
              <CheckCircle sx={{ fontSize: 64, color: '#4caf50' }} />
              <Typography sx={{ color: '#fff', fontWeight: 500 }}>{getStatusText()}</Typography>
            </>
          ) : (
            <>
              <ErrorIcon sx={{ fontSize: 64, color: '#f44336' }} />
              <Typography sx={{ color: '#fff', fontWeight: 500 }}>{getStatusText()}</Typography>
              {errorMessage && (
                <Typography sx={{ color: '#999', fontSize: '0.875rem', textAlign: 'center' }}>
                  {errorMessage}
                </Typography>
              )}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: primaryColor,
            color: '#fff',
            '&:hover': {
              backgroundColor: '#5058e6',
            },
          }}
        >
          {status === 'completed' || status === 'error' ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProgressModal;

