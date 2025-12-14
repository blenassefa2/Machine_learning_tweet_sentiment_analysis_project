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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Paper,
} from '@mui/material';
import { CheckCircle, Error as ErrorIcon } from '@mui/icons-material';
import { getCleaningJob } from '../api/cleaning';
import { getLabelJob } from '../api/label';
import { getTrainingJob } from '../api/training';
import { previewDataset } from '../api/datasets';
import { useSession } from '../context/SessionContext';

interface ProgressModalProps {
  open: boolean;
  jobId: string | null;
  jobType: 'cleaning' | 'labeling' | 'training' | null;
  onClose: () => void;
  onComplete?: () => void;
}

const ProgressModal = ({ open, jobId, jobType, onClose, onComplete }: ProgressModalProps) => {
  const { sessionId } = useSession();
  const [status, setStatus] = useState<'pending' | 'queued' | 'running' | 'completed' | 'error' | 'failed'>('pending');
  const [progress, setProgress] = useState<number>(0);
  const [message, setMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(false);
  const [datasetId, setDatasetId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !jobId || !jobType) {
      setStatus('pending');
      setProgress(0);
      setMessage('');
      setErrorMessage('');
      setPreviewData([]);
      setDatasetId(null);
      return;
    }

    let interval: ReturnType<typeof setInterval> | null = null;
    const checkStatus = async () => {
      try {
        let response;
        if (jobType === 'cleaning') {
          response = await getCleaningJob(jobId);
        } else if (jobType === 'labeling') {
          response = await getLabelJob(jobId);
        } else if (jobType === 'training') {
          response = await getTrainingJob(jobId);
        } else {
          return;
        }

        setStatus(response.status);
        
        // Store dataset_id for cleaning and labeling jobs
        if ((jobType === 'cleaning' || jobType === 'labeling') && (response as any).dataset_id) {
          setDatasetId((response as any).dataset_id);
        }
        
        // Progress and message are available for cleaning jobs, optional for others
        const cleaningResponse = response as any; // Type assertion for cleaning job response
        if (cleaningResponse.progress !== undefined) {
          setProgress(cleaningResponse.progress || 0);
        } else {
          setProgress(response.status === 'completed' ? 100 : response.status === 'running' ? 50 : 0);
        }
        
        if (cleaningResponse.message !== undefined) {
          setMessage(cleaningResponse.message || '');
        }
        
        if (response.logs) setErrorMessage(response.logs);
        if ((response.status === 'error' || response.status === 'failed') && cleaningResponse.message) {
          setErrorMessage(cleaningResponse.message);
        }

        if (response.status === 'completed') {
          if (interval) clearInterval(interval);
          setProgress(100);
          
          // Load preview for cleaning and labeling jobs (use dataset_id from response if available)
          const currentDatasetId = (response as any).dataset_id || datasetId;
          if ((jobType === 'cleaning' || jobType === 'labeling') && currentDatasetId && sessionId && previewData.length === 0) {
            if (jobType === 'cleaning') {
              loadCleanedPreview(currentDatasetId, sessionId);
            } else if (jobType === 'labeling') {
              loadLabeledPreview(currentDatasetId, sessionId);
            }
          }
          
          if (onComplete) onComplete();
        } else if (response.status === 'error' || response.status === 'failed') {
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

  const loadCleanedPreview = async (datasetId: string, sessionId: string) => {
    setLoadingPreview(true);
    try {
      const preview = await previewDataset(datasetId, sessionId, true);
      setPreviewData(preview || []);
    } catch (err: any) {
      console.error('Failed to load preview:', err);
      setPreviewData([['Unable to load preview']]);
    } finally {
      setLoadingPreview(false);
    }
  };

  const loadLabeledPreview = async (datasetId: string, sessionId: string) => {
    setLoadingPreview(true);
    try {
      // For labeled datasets, show the original/cleaned version (not the labeled file itself)
      // The labeled file has labels added, but we want to show the data that was labeled
      const preview = await previewDataset(datasetId, sessionId, false);
      setPreviewData(preview || []);
    } catch (err: any) {
      console.error('Failed to load preview:', err);
      setPreviewData([['Unable to load preview']]);
    } finally {
      setLoadingPreview(false);
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
      case 'queued':
        return 'Job queued...';
      case 'running':
        return 'Processing...';
      case 'completed':
        return 'Completed successfully!';
      case 'error':
      case 'failed':
        return 'Error occurred';
      default:
        return 'Unknown status';
    }
  };

  const primaryColor = '#646cff';

  return (
      <Dialog
      open={open}
      onClose={status === 'completed' || status === 'error' || status === 'failed' ? onClose : undefined}
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
        {jobType === 'labeling' && 'Labeling'}
        {jobType === 'training' && 'Model Training'}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 2 }}>
          {status === 'pending' || status === 'queued' || status === 'running' ? (
            <>
              <CircularProgress sx={{ color: primaryColor }} />
              <Typography sx={{ color: '#ccc' }}>{getStatusText()}</Typography>
              {message && (
                <Typography sx={{ color: '#999', fontSize: '0.875rem', textAlign: 'center' }}>
                  {message}
                </Typography>
              )}
              <Box sx={{ width: '100%' }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{
                    width: '100%',
                    height: 8,
                    borderRadius: 1,
                    backgroundColor: '#1a1a1c',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: primaryColor,
                    },
                  }}
                />
                <Typography sx={{ color: '#999', fontSize: '0.75rem', textAlign: 'center', mt: 1 }}>
                  {progress}%
                </Typography>
              </Box>
            </>
          ) : status === 'completed' ? (
            <>
              <CheckCircle sx={{ fontSize: 64, color: '#4caf50' }} />
              <Typography sx={{ color: '#fff', fontWeight: 500 }}>{getStatusText()}</Typography>
              {message && (
                <Typography sx={{ color: '#999', fontSize: '0.875rem', textAlign: 'center' }}>
                  {message}
                </Typography>
              )}
              {(jobType === 'cleaning' || jobType === 'labeling') && (
                <Box sx={{ width: '100%', mt: 2 }}>
                  <Typography sx={{ color: '#fff', mb: 1, fontSize: '0.875rem', fontWeight: 500 }}>
                    {jobType === 'cleaning' 
                      ? 'Preview of Cleaned Data (Top 5 rows):'
                      : 'Preview of Labeled Dataset (Top 5 rows):'}
                  </Typography>
                  {loadingPreview ? (
                    <CircularProgress size={24} sx={{ color: primaryColor }} />
                  ) : previewData.length > 0 ? (
                    <TableContainer 
                      component={Paper} 
                      sx={{ 
                        maxHeight: 300, 
                        backgroundColor: '#1a1a1c',
                        border: '1px solid #2a2a2c',
                      }}
                    >
                      <Table size="small">
                        <TableBody>
                          {previewData.map((row, rowIdx) => (
                            <TableRow key={rowIdx}>
                              {row.map((cell, cellIdx) => {
                                const cellText = String(cell || '');
                                const truncated = cellText.length > 50 
                                  ? cellText.substring(0, 50) + '...' 
                                  : cellText;
                                return (
                                  <TableCell
                                    key={cellIdx}
                                    sx={{
                                      color: '#ccc',
                                      borderBottom: '1px solid #2a2a2c',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      maxWidth: 200,
                                    }}
                                    title={cellText}
                                  >
                                    {truncated}
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : null}
                </Box>
              )}
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
          {status === 'completed' || status === 'error' || status === 'failed' ? 'Close' : 'Cancel'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProgressModal;

