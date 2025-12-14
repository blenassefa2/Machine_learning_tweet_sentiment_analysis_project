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
import { 
  CheckCircle, 
  Error as ErrorIcon,
  SentimentVeryDissatisfied,
  SentimentNeutral,
  SentimentVerySatisfied,
  Label as LabelIcon,
} from '@mui/icons-material';
import { getCleaningJob } from '../api/cleaning';
import { getLabelJob, getLabelingResult } from '../api/label';
import { getTrainingJob } from '../api/training';
import { previewDataset } from '../api/datasets';
import { useSession } from '../context/SessionContext';

interface LabelingSummary {
  total?: number;
  labeled?: number;
  neutral?: number;
  label_distribution?: {
    '0'?: number;
    '2'?: number;
    '4'?: number;
  };
  total_rows?: number;
  labeled_rows?: number;
  unlabeled_rows?: number;
}

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
  const [labelingSummary, setLabelingSummary] = useState<LabelingSummary | null>(null);
  const [labelingMethod, setLabelingMethod] = useState<string>('');
  const [summaryLoaded, setSummaryLoaded] = useState<boolean>(false);

  const primaryColor = '#646cff';

  useEffect(() => {
    if (!open || !jobId || !jobType) {
      setStatus('pending');
      setProgress(0);
      setMessage('');
      setErrorMessage('');
      setPreviewData([]);
      setDatasetId(null);
      setLabelingSummary(null);
      setLabelingMethod('');
      setSummaryLoaded(false);
      return;
    }

    let interval: ReturnType<typeof setInterval> | null = null;
    const checkStatus = async () => {
      try {
        let response: any;
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
        
        // Store dataset_id and labeling method
        if ((jobType === 'cleaning' || jobType === 'labeling') && response.dataset_id) {
          setDatasetId(response.dataset_id);
        }
        if (jobType === 'labeling' && response.method) {
          setLabelingMethod(response.method);
        }
        
        // Progress and message
        if (response.progress !== undefined) {
          setProgress(response.progress || 0);
        } else {
          setProgress(response.status === 'completed' ? 100 : response.status === 'running' ? 50 : 0);
        }
        
        if (response.message !== undefined) {
          setMessage(response.message || '');
        }
        
        if (response.logs) setErrorMessage(response.logs);
        if ((response.status === 'error' || response.status === 'failed') && response.message) {
          setErrorMessage(response.message);
        }

        if (response.status === 'completed') {
          if (interval) clearInterval(interval);
          setProgress(100);
          
          const currentDatasetId = response.dataset_id || datasetId;
          setDatasetId(currentDatasetId);
          
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

    checkStatus();
    interval = setInterval(checkStatus, 1500);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [open, jobId, jobType, onComplete]);

  // Load data when job completes
  useEffect(() => {
    if (status === 'completed' && datasetId && sessionId) {
      if (jobType === 'cleaning' && previewData.length === 0) {
        loadCleanedPreview(datasetId, sessionId);
      } else if (jobType === 'labeling' && !summaryLoaded) {
        setSummaryLoaded(true);
        loadLabelingSummary(datasetId, sessionId);
      }
    }
  }, [status, datasetId, sessionId, jobType, summaryLoaded, previewData.length]);

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

  const loadLabelingSummary = async (dsId: string, sessId: string) => {
    console.log('Loading labeling summary for dataset:', dsId, 'session:', sessId);
    setLoadingPreview(true);
    try {
      const result = await getLabelingResult(dsId, sessId);
      console.log('Labeling result:', result);
      if (result.summary) {
        console.log('Setting summary:', result.summary);
        setLabelingSummary(result.summary);
      }
      if (result.method) {
        setLabelingMethod(result.method);
      }
    } catch (err: any) {
      console.error('Failed to load labeling summary:', err);
      // Set a default summary so user sees something
      setLabelingSummary({ total: 0, label_distribution: { '0': 0, '2': 0, '4': 0 } });
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

  // Calculate label distribution from summary
  const getLabelDistribution = () => {
    if (!labelingSummary) return { negative: 0, neutral: 0, positive: 0, total: 0 };
    
    const dist = labelingSummary.label_distribution || {};
    const negative = dist['0'] || 0;
    const neutral = dist['2'] || labelingSummary.neutral || 0;
    const positive = dist['4'] || 0;
    const total = labelingSummary.total || labelingSummary.total_rows || (negative + neutral + positive);
    
    return { negative, neutral, positive, total };
  };

  const renderLabelingGraphics = () => {
    const { negative, neutral, positive, total } = getLabelDistribution();
    
    if (total === 0) {
      return (
        <Typography sx={{ color: '#999', textAlign: 'center' }}>
          Labeling completed
        </Typography>
      );
    }

    const negPercent = total > 0 ? (negative / total) * 100 : 0;
    const neuPercent = total > 0 ? (neutral / total) * 100 : 0;
    const posPercent = total > 0 ? (positive / total) * 100 : 0;

    return (
      <Box sx={{ width: '100%' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, justifyContent: 'center' }}>
          <LabelIcon sx={{ color: primaryColor }} />
          <Typography sx={{ color: '#fff', fontWeight: 600 }}>
            Labeling Results
          </Typography>
        </Box>

        {/* Method badge */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography 
            component="span"
            sx={{ 
              backgroundColor: primaryColor, 
              color: '#fff', 
              px: 2, 
              py: 0.5, 
              borderRadius: 2,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
            }}
          >
            {labelingMethod || 'Auto'} Labeling
          </Typography>
        </Box>

        {/* Distribution Bar */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', height: 24, borderRadius: 2, overflow: 'hidden' }}>
            {negative > 0 && (
              <Box 
                sx={{ 
                  width: `${negPercent}%`, 
                  backgroundColor: '#f44336',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {negPercent > 10 && (
                  <Typography sx={{ color: '#fff', fontSize: '0.7rem', fontWeight: 600 }}>
                    {negPercent.toFixed(0)}%
                  </Typography>
                )}
              </Box>
            )}
            {neutral > 0 && (
              <Box 
                sx={{ 
                  width: `${neuPercent}%`, 
                  backgroundColor: '#ff9800',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {neuPercent > 10 && (
                  <Typography sx={{ color: '#fff', fontSize: '0.7rem', fontWeight: 600 }}>
                    {neuPercent.toFixed(0)}%
                  </Typography>
                )}
              </Box>
            )}
            {positive > 0 && (
              <Box 
                sx={{ 
                  width: `${posPercent}%`, 
                  backgroundColor: '#4caf50',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {posPercent > 10 && (
                  <Typography sx={{ color: '#fff', fontSize: '0.7rem', fontWeight: 600 }}>
                    {posPercent.toFixed(0)}%
                  </Typography>
                )}
              </Box>
            )}
          </Box>
        </Box>

        {/* Stats Cards */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Box 
            sx={{ 
              p: 2, 
              backgroundColor: 'rgba(244, 67, 54, 0.1)', 
              borderRadius: 2,
              border: '1px solid rgba(244, 67, 54, 0.3)',
              textAlign: 'center',
              flex: 1,
            }}
          >
            <SentimentVeryDissatisfied sx={{ color: '#f44336', fontSize: 32, mb: 0.5 }} />
            <Typography sx={{ color: '#f44336', fontWeight: 700, fontSize: '1.25rem' }}>
              {negative}
            </Typography>
            <Typography sx={{ color: '#999', fontSize: '0.75rem' }}>
              Negative
            </Typography>
          </Box>
          
          <Box 
            sx={{ 
              p: 2, 
              backgroundColor: 'rgba(255, 152, 0, 0.1)', 
              borderRadius: 2,
              border: '1px solid rgba(255, 152, 0, 0.3)',
              textAlign: 'center',
              flex: 1,
            }}
          >
            <SentimentNeutral sx={{ color: '#ff9800', fontSize: 32, mb: 0.5 }} />
            <Typography sx={{ color: '#ff9800', fontWeight: 700, fontSize: '1.25rem' }}>
              {neutral}
            </Typography>
            <Typography sx={{ color: '#999', fontSize: '0.75rem' }}>
              Neutral
            </Typography>
          </Box>
          
          <Box 
            sx={{ 
              p: 2, 
              backgroundColor: 'rgba(76, 175, 80, 0.1)', 
              borderRadius: 2,
              border: '1px solid rgba(76, 175, 80, 0.3)',
              textAlign: 'center',
              flex: 1,
            }}
          >
            <SentimentVerySatisfied sx={{ color: '#4caf50', fontSize: 32, mb: 0.5 }} />
            <Typography sx={{ color: '#4caf50', fontWeight: 700, fontSize: '1.25rem' }}>
              {positive}
            </Typography>
            <Typography sx={{ color: '#999', fontSize: '0.75rem' }}>
              Positive
            </Typography>
          </Box>
        </Box>

        {/* Total */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography sx={{ color: '#999', fontSize: '0.875rem' }}>
            Total Labeled: <span style={{ color: '#fff', fontWeight: 600 }}>{total}</span> rows
          </Typography>
        </Box>
      </Box>
    );
  };

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
              
              {/* Cleaning: Show preview */}
              {jobType === 'cleaning' && (
                <Box sx={{ width: '100%', mt: 2 }}>
                  <Typography sx={{ color: '#fff', mb: 1, fontSize: '0.875rem', fontWeight: 500 }}>
                    Preview of Cleaned Data (Top 5 rows):
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

              {/* Labeling: Show graphical summary */}
              {jobType === 'labeling' && (
                <Box sx={{ width: '100%', mt: 2 }}>
                  {loadingPreview ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress size={24} sx={{ color: primaryColor }} />
                    </Box>
                  ) : (
                    renderLabelingGraphics()
                  )}
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
