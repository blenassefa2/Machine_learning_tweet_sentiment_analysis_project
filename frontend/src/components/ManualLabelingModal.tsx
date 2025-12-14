import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  LinearProgress,
  Chip,
} from '@mui/material';
import { 
  SentimentVeryDissatisfied, 
  SentimentNeutral, 
  SentimentVerySatisfied,
  NavigateNext,
  NavigateBefore,
  Check,
  Stop
} from '@mui/icons-material';
import { labelManual, getFullDataset } from '../api/label';
import { useSession } from '../context/SessionContext';

interface ManualLabelingModalProps {
  open: boolean;
  datasetId: string | null;
  onClose: () => void;
  onComplete: (jobId: string) => void;
  onStopEarly: (annotations: Array<{ row_index: number; label: number }>) => void;
}

const ManualLabelingModal = ({
  open,
  datasetId,
  onClose,
  onComplete,
  onStopEarly,
}: ManualLabelingModalProps) => {
  const { sessionId } = useSession();
  const [currentRowIndex, setCurrentRowIndex] = useState<number>(0);
  const [currentLabel, setCurrentLabel] = useState<number>(2); // Default to neutral
  const [allRows, setAllRows] = useState<string[][]>([]);
  const [textColumnIndex, setTextColumnIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [annotations, setAnnotations] = useState<Map<number, number>>(new Map()); // row_index -> label
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const primaryColor = '#646cff';

  useEffect(() => {
    if (open && datasetId && sessionId) {
      loadFullDataset();
      setCurrentRowIndex(0);
      setAnnotations(new Map());
    }
  }, [open, datasetId, sessionId]);

  const loadFullDataset = async () => {
    if (!datasetId || !sessionId) return;
    setLoading(true);
    try {
      const result = await getFullDataset(datasetId, sessionId, true);
      setAllRows(result.rows || []);
      setTextColumnIndex(result.text_column_index || 0);
    } catch (err) {
      console.error('Failed to load dataset:', err);
      setAllRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLabelRow = (label: number) => {
    const newAnnotations = new Map(annotations);
    newAnnotations.set(currentRowIndex, label);
    setAnnotations(newAnnotations);
    setCurrentLabel(label);
  };

  const handleNext = () => {
    // Save current annotation if not already saved
    if (!annotations.has(currentRowIndex)) {
      handleLabelRow(currentLabel);
    }
    
    if (currentRowIndex < allRows.length - 1) {
      const nextIndex = currentRowIndex + 1;
      setCurrentRowIndex(nextIndex);
      // Set the label to existing annotation or default to neutral
      setCurrentLabel(annotations.get(nextIndex) ?? 2);
    }
  };

  const handlePrevious = () => {
    if (currentRowIndex > 0) {
      const prevIndex = currentRowIndex - 1;
      setCurrentRowIndex(prevIndex);
      setCurrentLabel(annotations.get(prevIndex) ?? 2);
    }
  };

  const handleFinish = async () => {
    if (!datasetId || !sessionId) return;
    
    // Make sure current row is annotated
    if (!annotations.has(currentRowIndex)) {
      handleLabelRow(currentLabel);
    }
    
    setIsSubmitting(true);
    try {
      // Convert Map to array of annotations
      const annotationsList = Array.from(annotations.entries()).map(([row_index, label]) => ({
        row_index,
        label,
      }));
      
      const result = await labelManual(datasetId, {
        session_id: sessionId,
        annotations: annotationsList,
        stop_early: false,
      });
      
      onComplete(result.job_id);
    } catch (error) {
      console.error('Error submitting labels:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStopEarly = async () => {
    if (!datasetId || !sessionId) return;
    
    // Make sure current row is annotated
    if (!annotations.has(currentRowIndex)) {
      handleLabelRow(currentLabel);
    }
    
    const annotationsList = Array.from(annotations.entries()).map(([row_index, label]) => ({
      row_index,
      label,
    }));
    
    if (annotationsList.length > 0) {
      onStopEarly(annotationsList);
    } else {
      onClose();
    }
  };

  const currentRow = allRows[currentRowIndex] || [];
  const currentTweet = currentRow[textColumnIndex] || 'No data available';
  const progress = allRows.length > 0 ? ((currentRowIndex + 1) / allRows.length) * 100 : 0;
  const labeledCount = annotations.size;
  
  // Count labels by type
  const labelCounts = { positive: 0, neutral: 0, negative: 0 };
  annotations.forEach((label) => {
    if (label === 4) labelCounts.positive++;
    else if (label === 2) labelCounts.neutral++;
    else if (label === 0) labelCounts.negative++;
  });

  const getLabelColor = (label: number) => {
    switch (label) {
      case 4: return '#4caf50';
      case 2: return '#ff9800';
      case 0: return '#f44336';
      default: return '#666';
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#0f0f11',
          border: '1px solid #1a1a1c',
          minHeight: '500px',
        },
      }}
    >
      <DialogTitle sx={{ color: '#fff', fontWeight: 600, pb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Manual Labeling
          </Typography>
          <Chip 
            label={`${currentRowIndex + 1} / ${allRows.length}`}
            sx={{ 
              backgroundColor: primaryColor, 
              color: '#fff',
              fontWeight: 600,
            }} 
          />
        </Box>
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ 
            mt: 2, 
            height: 6, 
            borderRadius: 3,
            backgroundColor: '#1a1a1c',
            '& .MuiLinearProgress-bar': {
              backgroundColor: primaryColor,
              borderRadius: 3,
            },
          }} 
        />
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8, gap: 2 }}>
              <CircularProgress sx={{ color: primaryColor }} />
              <Typography sx={{ color: '#999' }}>Loading dataset...</Typography>
            </Box>
          ) : allRows.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography sx={{ color: '#999' }}>No data available</Typography>
            </Box>
          ) : (
            <>
              {/* Tweet Text Display */}
              <Box>
                <Typography sx={{ color: '#999', mb: 1, fontSize: '0.875rem' }}>
                  Tweet Text:
                </Typography>
                <Box
                  sx={{
                    p: 3,
                    backgroundColor: '#1a1a1c',
                    borderRadius: 2,
                    border: annotations.has(currentRowIndex) 
                      ? `2px solid ${getLabelColor(annotations.get(currentRowIndex)!)}` 
                      : '1px solid #2a2a2c',
                    minHeight: 120,
                    maxHeight: 200,
                    overflow: 'auto',
                  }}
                >
                  <Typography sx={{ color: '#fff', wordBreak: 'break-word', lineHeight: 1.6 }}>
                    {currentTweet}
                  </Typography>
                </Box>
              </Box>

              {/* Quick Label Buttons */}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button
                  variant={annotations.get(currentRowIndex) === 0 ? 'contained' : 'outlined'}
                  onClick={() => handleLabelRow(0)}
                  startIcon={<SentimentVeryDissatisfied />}
                  sx={{
                    flex: 1,
                    py: 1.5,
                    borderColor: '#f44336',
                    color: annotations.get(currentRowIndex) === 0 ? '#fff' : '#f44336',
                    backgroundColor: annotations.get(currentRowIndex) === 0 ? '#f44336' : 'transparent',
                    '&:hover': {
                      borderColor: '#f44336',
                      backgroundColor: annotations.get(currentRowIndex) === 0 ? '#d32f2f' : 'rgba(244, 67, 54, 0.1)',
                    },
                  }}
                >
                  Negative (0)
                </Button>
                <Button
                  variant={annotations.get(currentRowIndex) === 2 ? 'contained' : 'outlined'}
                  onClick={() => handleLabelRow(2)}
                  startIcon={<SentimentNeutral />}
                  sx={{
                    flex: 1,
                    py: 1.5,
                    borderColor: '#ff9800',
                    color: annotations.get(currentRowIndex) === 2 ? '#fff' : '#ff9800',
                    backgroundColor: annotations.get(currentRowIndex) === 2 ? '#ff9800' : 'transparent',
                    '&:hover': {
                      borderColor: '#ff9800',
                      backgroundColor: annotations.get(currentRowIndex) === 2 ? '#f57c00' : 'rgba(255, 152, 0, 0.1)',
                    },
                  }}
                >
                  Neutral (2)
                </Button>
                <Button
                  variant={annotations.get(currentRowIndex) === 4 ? 'contained' : 'outlined'}
                  onClick={() => handleLabelRow(4)}
                  startIcon={<SentimentVerySatisfied />}
                  sx={{
                    flex: 1,
                    py: 1.5,
                    borderColor: '#4caf50',
                    color: annotations.get(currentRowIndex) === 4 ? '#fff' : '#4caf50',
                    backgroundColor: annotations.get(currentRowIndex) === 4 ? '#4caf50' : 'transparent',
                    '&:hover': {
                      borderColor: '#4caf50',
                      backgroundColor: annotations.get(currentRowIndex) === 4 ? '#388e3c' : 'rgba(76, 175, 80, 0.1)',
                    },
                  }}
                >
                  Positive (4)
                </Button>
              </Box>

              {/* Stats Bar */}
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                p: 2,
                backgroundColor: '#151517',
                borderRadius: 2,
              }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Chip 
                    icon={<SentimentVeryDissatisfied sx={{ color: '#f44336 !important' }} />}
                    label={labelCounts.negative} 
                    size="small"
                    sx={{ backgroundColor: 'rgba(244, 67, 54, 0.2)', color: '#f44336' }}
                  />
                  <Chip 
                    icon={<SentimentNeutral sx={{ color: '#ff9800 !important' }} />}
                    label={labelCounts.neutral} 
                    size="small"
                    sx={{ backgroundColor: 'rgba(255, 152, 0, 0.2)', color: '#ff9800' }}
                  />
                  <Chip 
                    icon={<SentimentVerySatisfied sx={{ color: '#4caf50 !important' }} />}
                    label={labelCounts.positive} 
                    size="small"
                    sx={{ backgroundColor: 'rgba(76, 175, 80, 0.2)', color: '#4caf50' }}
                  />
                </Box>
                <Typography sx={{ color: '#999', fontSize: '0.875rem' }}>
                  Labeled: {labeledCount} / {allRows.length}
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, gap: 1, borderTop: '1px solid #1a1a1c' }}>
        <Button
          onClick={handleStopEarly}
          variant="outlined"
          startIcon={<Stop />}
          disabled={isSubmitting || loading}
          sx={{
            borderColor: '#666',
            color: '#999',
            '&:hover': {
              borderColor: '#888',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            },
          }}
        >
          Stop & Save ({labeledCount})
        </Button>
        
        <Box sx={{ flex: 1 }} />
        
        <Button
          onClick={handlePrevious}
          variant="outlined"
          startIcon={<NavigateBefore />}
          disabled={currentRowIndex === 0 || isSubmitting || loading}
          sx={{
            borderColor: '#444',
            color: '#ccc',
            '&:hover': {
              borderColor: '#666',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            },
            '&:disabled': {
              borderColor: '#333',
              color: '#555',
            },
          }}
        >
          Previous
        </Button>
        
        {currentRowIndex < allRows.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            endIcon={<NavigateNext />}
            disabled={isSubmitting || loading}
            sx={{
              backgroundColor: primaryColor,
              color: '#fff',
              '&:hover': {
                backgroundColor: '#5058e6',
              },
            }}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleFinish}
            variant="contained"
            startIcon={isSubmitting ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <Check />}
            disabled={isSubmitting || loading || labeledCount === 0}
            sx={{
              backgroundColor: '#4caf50',
              color: '#fff',
              '&:hover': {
                backgroundColor: '#388e3c',
              },
              '&:disabled': {
                backgroundColor: '#333',
                color: '#666',
              },
            }}
          >
            {isSubmitting ? 'Submitting...' : `Finish (${labeledCount} labeled)`}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ManualLabelingModal;
