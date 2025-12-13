import { Paper, Box, FormControl, FormLabel, Select, MenuItem, InputLabel, Typography, Slider } from '@mui/material';
import { Settings } from '@mui/icons-material';
import { keyframes } from '@emotion/react';

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

interface ClassifierParams {
  kernel: string;
  cValue: number;
  gamma: string;
  nEstimators: number;
  maxDepth: number;
  kNeighbors: number;
}

interface ClassificationConfigProps {
  classifier: string;
  setClassifier: (value: string) => void;
  classifierParams: ClassifierParams;
  setClassifierParams: (params: ClassifierParams) => void;
}

const ClassificationConfig = ({
  classifier,
  setClassifier,
  classifierParams,
  setClassifierParams,
}: ClassificationConfigProps) => {
  const primaryColor = '#646cff';

  return (
    <Paper
      sx={{
        p: 3,
        backgroundColor: '#0f0f11',
        border: '1px solid #1a1a1c',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease',
        animation: `${fadeInUp} 0.8s ease-out 0.4s both`,
        '&:hover': {
          borderColor: '#1f1f22',
          transform: 'translateY(-5px)',
          boxShadow: `0 10px 30px ${primaryColor}20`,
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Settings sx={{ color: primaryColor }} />
        <FormLabel component="legend" sx={{ color: '#fff', fontWeight: 600 }}>
          Classification
        </FormLabel>
      </Box>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="classifier-label" sx={{ color: '#999' }}>
          Classifier Algorithm
        </InputLabel>
        <Select
          labelId="classifier-label"
          value={classifier}
          onChange={(e) => setClassifier(e.target.value)}
          label="Classifier Algorithm"
          sx={{
            color: '#fff',
            '.MuiOutlinedInput-notchedOutline': {
              borderColor: '#444',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: primaryColor,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: primaryColor,
            },
          }}
        >
          <MenuItem value="naive-bayes">Naive Bayes</MenuItem>
          <MenuItem value="svm">SVM</MenuItem>
          <MenuItem value="random-forest">Random Forest</MenuItem>
          <MenuItem value="knn">K-Nearest Neighbors</MenuItem>
        </Select>
      </FormControl>

      {classifier === 'svm' && (
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="kernel-label" sx={{ color: '#999' }}>Kernel</InputLabel>
            <Select
              labelId="kernel-label"
              value={classifierParams.kernel}
              onChange={(e) => setClassifierParams({ ...classifierParams, kernel: e.target.value })}
              label="Kernel"
              sx={{
                color: '#fff',
                '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
              }}
            >
              <MenuItem value="rbf">RBF</MenuItem>
              <MenuItem value="linear">Linear</MenuItem>
              <MenuItem value="poly">Polynomial</MenuItem>
            </Select>
          </FormControl>
          <Typography sx={{ color: '#ccc', mb: 1 }}>C Value: {classifierParams.cValue}</Typography>
          <Slider
            value={classifierParams.cValue}
            onChange={(_, val) => setClassifierParams({ ...classifierParams, cValue: val as number })}
            min={0.1}
            max={10}
            step={0.1}
            sx={{ color: primaryColor }}
          />
        </Box>
      )}

      {classifier === 'random-forest' && (
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ color: '#ccc', mb: 1 }}>N Estimators: {classifierParams.nEstimators}</Typography>
          <Slider
            value={classifierParams.nEstimators}
            onChange={(_, val) => setClassifierParams({ ...classifierParams, nEstimators: val as number })}
            min={10}
            max={200}
            step={10}
            sx={{ color: primaryColor }}
          />
          <Typography sx={{ color: '#ccc', mb: 1, mt: 2 }}>Max Depth: {classifierParams.maxDepth}</Typography>
          <Slider
            value={classifierParams.maxDepth}
            onChange={(_, val) => setClassifierParams({ ...classifierParams, maxDepth: val as number })}
            min={1}
            max={20}
            sx={{ color: primaryColor }}
          />
        </Box>
      )}

      {classifier === 'knn' && (
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ color: '#ccc', mb: 1 }}>K Neighbors: {classifierParams.kNeighbors}</Typography>
          <Slider
            value={classifierParams.kNeighbors}
            onChange={(_, val) => setClassifierParams({ ...classifierParams, kNeighbors: val as number })}
            min={1}
            max={20}
            sx={{ color: primaryColor }}
          />
        </Box>
      )}
    </Paper>
  );
};

export default ClassificationConfig;

