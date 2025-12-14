import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Assessment,
  Speed,
  TrackChanges,
  GridOn,
} from '@mui/icons-material';
import type { EvaluationResponse } from '../api/evaluate';

interface EvaluationModalProps {
  open: boolean;
  evaluation: EvaluationResponse | null;
  onClose: () => void;
}

// Metric Card Component
const MetricCard = ({
  icon,
  title,
  value,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  color: string;
}) => {
  const percentage = (value * 100).toFixed(1);
  
  return (
    <Paper
      sx={{
        p: 2,
        backgroundColor: '#1a1a1c',
        border: '1px solid #2a2a2c',
        borderRadius: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        transition: 'all 0.3s ease',
        '&:hover': {
          borderColor: color,
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 20px ${color}30`,
        },
      }}
    >
      <Box sx={{ color, fontSize: 40 }}>{icon}</Box>
      <Typography sx={{ color: '#999', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: 1 }}>
        {title}
      </Typography>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: `conic-gradient(${color} ${value * 360}deg, #2a2a2c ${value * 360}deg)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            sx={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              backgroundColor: '#1a1a1c',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem' }}>
              {percentage}%
            </Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

// Confusion Matrix Component
const ConfusionMatrix = ({ matrix }: { matrix: number[][] }) => {
  if (!matrix || matrix.length === 0) {
    return (
      <Typography sx={{ color: '#999', textAlign: 'center' }}>
        Confusion matrix not available
      </Typography>
    );
  }

  // Get the max value for color scaling
  const maxVal = Math.max(...matrix.flat());
  
  // Labels for sentiment (assuming 0=negative, 2=neutral, 4=positive or similar)
  const labels = matrix.length === 3 
    ? ['Negative', 'Neutral', 'Positive'] 
    : matrix.map((_, i) => `Class ${i}`);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, justifyContent: 'center' }}>
        <GridOn sx={{ color: '#646cff' }} />
        <Typography sx={{ color: '#fff', fontWeight: 600 }}>
          Confusion Matrix
        </Typography>
      </Box>
      
      <TableContainer
        component={Paper}
        sx={{
          backgroundColor: '#1a1a1c',
          border: '1px solid #2a2a2c',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  backgroundColor: '#0f0f11',
                  color: '#999',
                  fontWeight: 600,
                  borderBottom: '1px solid #2a2a2c',
                  fontSize: '0.75rem',
                }}
              >
                Actual \ Predicted
              </TableCell>
              {labels.map((label, idx) => (
                <TableCell
                  key={idx}
                  align="center"
                  sx={{
                    backgroundColor: '#0f0f11',
                    color: '#ccc',
                    fontWeight: 600,
                    borderBottom: '1px solid #2a2a2c',
                    fontSize: '0.75rem',
                  }}
                >
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {matrix.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                <TableCell
                  sx={{
                    backgroundColor: '#0f0f11',
                    color: '#ccc',
                    fontWeight: 600,
                    borderBottom: '1px solid #2a2a2c',
                    fontSize: '0.75rem',
                  }}
                >
                  {labels[rowIdx]}
                </TableCell>
                {row.map((value, colIdx) => {
                  // Calculate color intensity based on value
                  const intensity = maxVal > 0 ? value / maxVal : 0;
                  const isDiagonal = rowIdx === colIdx;
                  const bgColor = isDiagonal
                    ? `rgba(76, 175, 80, ${0.2 + intensity * 0.6})` // Green for diagonal (correct predictions)
                    : `rgba(244, 67, 54, ${intensity * 0.5})`; // Red for off-diagonal (errors)
                  
                  return (
                    <TableCell
                      key={colIdx}
                      align="center"
                      sx={{
                        backgroundColor: bgColor,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '1rem',
                        borderBottom: '1px solid #2a2a2c',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          transform: 'scale(1.1)',
                        },
                      }}
                    >
                      {value}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mt: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(76, 175, 80, 0.6)', borderRadius: 1 }} />
          <Typography sx={{ color: '#999', fontSize: '0.75rem' }}>Correct</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: 'rgba(244, 67, 54, 0.4)', borderRadius: 1 }} />
          <Typography sx={{ color: '#999', fontSize: '0.75rem' }}>Errors</Typography>
        </Box>
      </Box>
    </Box>
  );
};

const EvaluationModal = ({ open, evaluation, onClose }: EvaluationModalProps) => {
  if (!evaluation) return null;

  const { metrics, model_name, algorithm, train_size, val_size } = evaluation;
  const primaryColor = '#646cff';

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
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ color: '#fff', fontWeight: 600, textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Assessment sx={{ color: primaryColor }} />
          Model Evaluation Results
        </Box>
        <Typography sx={{ color: '#999', fontSize: '0.875rem', mt: 1 }}>
          {model_name} ({algorithm}) • Train: {train_size} samples • Validation: {val_size} samples
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ py: 2 }}>
          {/* Metric Cards */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MetricCard
                icon={<Speed />}
                title="Accuracy"
                value={metrics.accuracy}
                color="#4caf50"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MetricCard
                icon={<TrackChanges />}
                title="Precision"
                value={metrics.precision}
                color="#2196f3"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MetricCard
                icon={<TrackChanges />}
                title="Recall"
                value={metrics.recall}
                color="#ff9800"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <MetricCard
                icon={<Assessment />}
                title="F1 Score"
                value={metrics.f1}
                color="#9c27b0"
              />
            </Grid>
          </Grid>

          {/* Additional Metrics */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 4, mb: 4 }}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ color: '#999', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Rand Index
              </Typography>
              <Typography sx={{ color: '#4caf50', fontSize: '1.5rem', fontWeight: 700 }}>
                {(metrics.rand_index * 100).toFixed(1)}%
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
              <Typography sx={{ color: '#999', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                Error Rate
              </Typography>
              <Typography sx={{ color: '#f44336', fontSize: '1.5rem', fontWeight: 700 }}>
                {(metrics.error_rate * 100).toFixed(1)}%
              </Typography>
            </Box>
          </Box>

          {/* Confusion Matrix */}
          <ConfusionMatrix matrix={metrics.confusion_matrix} />
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: primaryColor,
            color: '#fff',
            px: 4,
            '&:hover': {
              backgroundColor: '#5058e6',
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EvaluationModal;

