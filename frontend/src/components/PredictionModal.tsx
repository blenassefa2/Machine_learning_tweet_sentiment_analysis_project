import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import { Psychology, SentimentVeryDissatisfied, SentimentNeutral, SentimentSatisfied } from '@mui/icons-material';
import type { PredictResponse } from '../api/predict';

interface PredictionModalProps {
  open: boolean;
  prediction: PredictResponse | null;
  onClose: () => void;
}

const PredictionModal = ({ open, prediction, onClose }: PredictionModalProps) => {
  const primaryColor = '#646cff';

  if (!prediction) return null;

  const { predictions, total_rows, label_distribution, algorithm, model_name, metrics } = prediction;
  
  const getLabelInfo = (label: number) => {
    switch (label) {
      case 0:
        return { text: 'Negative', color: '#f44336', icon: <SentimentVeryDissatisfied sx={{ fontSize: 16 }} /> };
      case 2:
        return { text: 'Neutral', color: '#ff9800', icon: <SentimentNeutral sx={{ fontSize: 16 }} /> };
      case 4:
        return { text: 'Positive', color: '#4caf50', icon: <SentimentSatisfied sx={{ fontSize: 16 }} /> };
      default:
        return { text: 'Unknown', color: '#666', icon: null };
    }
  };

  const total = (label_distribution['0'] || 0) + (label_distribution['2'] || 0) + (label_distribution['4'] || 0);
  const negPercent = total > 0 ? ((label_distribution['0'] || 0) / total) * 100 : 0;
  const neuPercent = total > 0 ? ((label_distribution['2'] || 0) / total) * 100 : 0;
  const posPercent = total > 0 ? ((label_distribution['4'] || 0) / total) * 100 : 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          backgroundColor: '#0f0f11',
          border: '1px solid #1a1a1c',
          color: '#fff',
        },
      }}
    >
      <DialogTitle sx={{ borderBottom: '1px solid #1a1a1c' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Psychology sx={{ color: '#ff9800' }} />
          <Typography variant="h6" sx={{ color: '#fff' }}>
            Prediction Results
          </Typography>
        </Box>
        <Typography sx={{ color: '#999', fontSize: '0.875rem', mt: 1 }}>
          Model: {model_name} ({algorithm}) • {total_rows} rows predicted
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ py: 3 }}>
        {/* Metrics Section (if available) */}
        {metrics && (
          <Box sx={{ mb: 4 }}>
            <Typography sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
              Evaluation Metrics (Dataset has target column)
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <MetricChip label="Accuracy" value={metrics.accuracy} color="#4caf50" />
              <MetricChip label="Precision" value={metrics.precision} color="#2196f3" />
              <MetricChip label="Recall" value={metrics.recall} color="#ff9800" />
              <MetricChip label="F1 Score" value={metrics.f1} color="#9c27b0" />
            </Box>
          </Box>
        )}

        {/* Label Distribution */}
        <Box sx={{ mb: 4 }}>
          <Typography sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
            Predicted Label Distribution
          </Typography>
          
          {/* Distribution Bar */}
          <Box sx={{ display: 'flex', height: 24, borderRadius: 1, overflow: 'hidden', mb: 2 }}>
            <Box sx={{ width: `${negPercent}%`, backgroundColor: '#f44336', minWidth: negPercent > 0 ? 4 : 0 }} />
            <Box sx={{ width: `${neuPercent}%`, backgroundColor: '#ff9800', minWidth: neuPercent > 0 ? 4 : 0 }} />
            <Box sx={{ width: `${posPercent}%`, backgroundColor: '#4caf50', minWidth: posPercent > 0 ? 4 : 0 }} />
          </Box>

          {/* Legend */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, backgroundColor: '#f44336', borderRadius: 1 }} />
              <Typography sx={{ color: '#ccc', fontSize: '0.875rem' }}>
                Negative: {label_distribution['0'] || 0} ({negPercent.toFixed(1)}%)
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, backgroundColor: '#ff9800', borderRadius: 1 }} />
              <Typography sx={{ color: '#ccc', fontSize: '0.875rem' }}>
                Neutral: {label_distribution['2'] || 0} ({neuPercent.toFixed(1)}%)
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ width: 12, height: 12, backgroundColor: '#4caf50', borderRadius: 1 }} />
              <Typography sx={{ color: '#ccc', fontSize: '0.875rem' }}>
                Positive: {label_distribution['4'] || 0} ({posPercent.toFixed(1)}%)
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Predictions Table */}
        <Typography sx={{ color: '#fff', fontWeight: 600, mb: 2 }}>
          Predictions (showing first {predictions.length} of {total_rows})
        </Typography>
        
        <TableContainer 
          component={Paper} 
          sx={{ 
            backgroundColor: '#1a1a1c',
            maxHeight: 400,
          }}
        >
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ backgroundColor: '#0f0f11', color: '#fff', fontWeight: 600 }}>#</TableCell>
                <TableCell sx={{ backgroundColor: '#0f0f11', color: '#fff', fontWeight: 600 }}>Tweet</TableCell>
                <TableCell sx={{ backgroundColor: '#0f0f11', color: '#fff', fontWeight: 600, width: 140 }}>Predicted</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {predictions.map((row, index) => {
                const labelInfo = getLabelInfo(row.predicted_label);
                return (
                  <TableRow key={index} sx={{ '&:hover': { backgroundColor: '#252528' } }}>
                    <TableCell sx={{ color: '#666', borderBottom: '1px solid #333' }}>{index + 1}</TableCell>
                    <TableCell sx={{ color: '#ccc', borderBottom: '1px solid #333', maxWidth: 500 }}>
                      {row.tweet}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #333' }}>
                      <Chip
                        icon={labelInfo.icon || undefined}
                        label={labelInfo.text}
                        size="small"
                        sx={{
                          backgroundColor: `${labelInfo.color}20`,
                          color: labelInfo.color,
                          border: `1px solid ${labelInfo.color}40`,
                          fontWeight: 500,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>

      <DialogActions sx={{ borderTop: '1px solid #1a1a1c', p: 2 }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: primaryColor,
            '&:hover': { backgroundColor: '#5058e6' },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Helper component for metric chips
const MetricChip = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <Box
    sx={{
      backgroundColor: `${color}15`,
      border: `1px solid ${color}40`,
      borderRadius: 2,
      px: 2,
      py: 1,
      minWidth: 100,
      textAlign: 'center',
    }}
  >
    <Typography sx={{ color: '#999', fontSize: '0.75rem', textTransform: 'uppercase' }}>
      {label}
    </Typography>
    <Typography sx={{ color, fontSize: '1.25rem', fontWeight: 700 }}>
      {(value * 100).toFixed(1)}%
    </Typography>
  </Box>
);

export default PredictionModal;

