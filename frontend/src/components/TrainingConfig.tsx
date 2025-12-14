import { Paper, Box, FormControl, FormLabel, Select, MenuItem, InputLabel, Checkbox, FormControlLabel, Typography, Slider } from '@mui/material';
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

interface TrainingConfigProps {
  learningModel: string;
  setLearningModel: (value: string) => void;
  crossValidation: boolean;
  setCrossValidation: (value: boolean) => void;
  autoTune: boolean;
  setAutoTune: (value: boolean) => void;
  testSplit: number;
  setTestSplit: (value: number) => void;
  // Optional props for backward compatibility (not used by current algorithms)
  epochs?: number;
  setEpochs?: (value: number) => void;
  learningRate?: number;
  setLearningRate?: (value: number) => void;
  batchSize?: number;
  setBatchSize?: (value: number) => void;
}

const TrainingConfig = ({
  learningModel,
  setLearningModel,
  crossValidation,
  setCrossValidation,
  autoTune,
  setAutoTune,
  testSplit,
  setTestSplit,
}: TrainingConfigProps) => {
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
        animation: `${fadeInUp} 0.8s ease-out 0.6s both`,
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
          Model Training
        </FormLabel>
      </Box>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="model-label" sx={{ color: '#999' }}>
          Learning Model
        </InputLabel>
        <Select
          labelId="model-label"
          value={learningModel}
          onChange={(e) => setLearningModel(e.target.value)}
          label="Learning Model"
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
          <MenuItem value="knn">K-Nearest Neighbors (KNN)</MenuItem>
          <MenuItem value="naive_bayes">Naive Bayes</MenuItem>
          <MenuItem value="naive_automatic">Naive Automatic</MenuItem>
          <MenuItem value="decision_tree">Decision Tree</MenuItem>
        </Select>
      </FormControl>
      <Box sx={{ mt: 1 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={crossValidation}
              onChange={(e) => setCrossValidation(e.target.checked)}
              sx={{
                color: primaryColor,
                '&.Mui-checked': {
                  color: primaryColor,
                },
              }}
            />
          }
          label="Cross Validation"
          sx={{ color: '#ccc', display: 'block', mb: 1 }}
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={autoTune}
              onChange={(e) => setAutoTune(e.target.checked)}
              sx={{
                color: primaryColor,
                '&.Mui-checked': {
                  color: primaryColor,
                },
              }}
            />
          }
          label="Auto-tune Parameters"
          sx={{ color: '#ccc' }}
        />
      </Box>

      {learningModel && (
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ color: '#ccc', mb: 1 }}>Test Split: {testSplit}%</Typography>
          <Slider
            value={testSplit}
            onChange={(_, val) => setTestSplit(val as number)}
            min={10}
            max={40}
            step={5}
            sx={{ color: primaryColor }}
          />
        </Box>
      )}
    </Paper>
  );
};

export default TrainingConfig;

