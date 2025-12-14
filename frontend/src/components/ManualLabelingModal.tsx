import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
} from '@mui/material';
import { labelSingleRow, previewDataset } from '../api/label';
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
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [annotations, setAnnotations] = useState<Array<{ row_index: number; label: number }>>([]);
  const [isLabeling, setIsLabeling] = useState<boolean>(false);

  const primaryColor = '#646cff';

  useEffect(() => {
    if (open && datasetId && sessionId) {
      loadPreview();
      setCurrentRowIndex(0);
      setAnnotations([]);
    }
  }, [open, datasetId, sessionId]);

  const loadPreview = async () => {
    if (!datasetId || !sessionId) return;
    setLoading(true);
    try {
      const preview = await previewDataset(datasetId, sessionId, false);
      setPreviewData(preview || []);
    } catch (err) {
      console.error('Failed to load preview:', err);
      setPreviewData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!datasetId || !sessionId || currentRowIndex >= previewData.length) return;

    setIsLabeling(true);
    try {
      // Label current row
      const result = await labelSingleRow(datasetId, {
        session_id: sessionId,
        row_index: currentRowIndex,
        label: currentLabel,
      });

      // Add to annotations
      const newAnnotation = { row_index: currentRowIndex, label: currentLabel };
      setAnnotations([...annotations, newAnnotation]);

      // Move to next row
      if (currentRowIndex < previewData.length - 1) {
        setCurrentRowIndex(currentRowIndex + 1);
        setCurrentLabel(2); // Reset to neutral
      } else {
        // All rows labeled, complete
        onComplete(result.job_id);
        onClose();
      }
    } catch (error) {
      console.error('Error labeling row:', error);
    } finally {
      setIsLabeling(false);
    }
  };

  const handleStopEarly = () => {
    if (annotations.length > 0) {
      onStopEarly(annotations);
    }
    onClose();
  };

  const currentRow = previewData[currentRowIndex] || [];
  const textColumnIndex = currentRow.length > 5 ? 5 : currentRow.length - 1; // Usually column 5 is tweet
  const currentTweet = currentRow[textColumnIndex] || 'No data available';

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
        },
      }}
    >
      <DialogTitle sx={{ color: '#fff', fontWeight: 600 }}>
        Manual Labeling - Row {currentRowIndex + 1} of {previewData.length}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, py: 2 }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress sx={{ color: primaryColor }} />
            </Box>
          ) : (
            <>
              <Box>
                <Typography sx={{ color: '#999', mb: 1, fontSize: '0.875rem' }}>
                  Tweet Text:
                </Typography>
                <Box
                  sx={{
                    p: 2,
                    backgroundColor: '#1a1a1c',
                    borderRadius: 1,
                    border: '1px solid #2a2a2c',
                    minHeight: 100,
                  }}
                >
                  <Typography sx={{ color: '#fff', wordBreak: 'break-word' }}>
                    {currentTweet}
                  </Typography>
                </Box>
              </Box>

              <FormControl fullWidth>
                <InputLabel id="label-select" sx={{ color: '#999' }}>
                  Target Label
                </InputLabel>
                <Select
                  labelId="label-select"
                  value={currentLabel}
                  onChange={(e) => setCurrentLabel(e.target.value as number)}
                  label="Target Label"
                  sx={{
                    color: '#fff',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: '#1a1a1c' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
                  }}
                >
                  <MenuItem value={0}>0 - Negative</MenuItem>
                  <MenuItem value={2}>2 - Neutral</MenuItem>
                  <MenuItem value={4}>4 - Positive</MenuItem>
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography sx={{ color: '#999', fontSize: '0.875rem' }}>
                  Labeled: {annotations.length} rows
                </Typography>
                <Typography sx={{ color: '#999', fontSize: '0.875rem' }}>
                  Remaining: {previewData.length - currentRowIndex - 1} rows
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button
          onClick={handleStopEarly}
          variant="outlined"
          sx={{
            borderColor: '#666',
            color: '#999',
            '&:hover': {
              borderColor: '#888',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
            },
          }}
        >
          Stop Here
        </Button>
        <Button
          onClick={handleNext}
          variant="contained"
          disabled={isLabeling || loading || currentRowIndex >= previewData.length}
          sx={{
            backgroundColor: primaryColor,
            color: '#fff',
            '&:hover': {
              backgroundColor: '#5058e6',
            },
            '&:disabled': {
              backgroundColor: '#444',
              color: '#666',
            },
          }}
        >
          {isLabeling ? (
            <CircularProgress size={20} sx={{ color: '#fff' }} />
          ) : currentRowIndex >= previewData.length - 1 ? (
            'Finish'
          ) : (
            'Next Row'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ManualLabelingModal;

