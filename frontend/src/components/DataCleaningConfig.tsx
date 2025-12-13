import { Paper, Box, FormControl, FormLabel, RadioGroup, FormControlLabel, Radio, Select, MenuItem, InputLabel } from '@mui/material';
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

interface DataCleaningConfigProps {
  cleaningOption: string;
  setCleaningOption: (value: string) => void;
  normalizeMethod: string;
  setNormalizeMethod: (value: string) => void;
  missingValueStrategy: string;
  setMissingValueStrategy: (value: string) => void;
}

const DataCleaningConfig = ({
  cleaningOption,
  setCleaningOption,
  normalizeMethod,
  setNormalizeMethod,
  missingValueStrategy,
  setMissingValueStrategy,
}: DataCleaningConfigProps) => {
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
        animation: `${fadeInUp} 0.8s ease-out 0.2s both`,
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
          Data Cleaning
        </FormLabel>
      </Box>
      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <RadioGroup value={cleaningOption} onChange={(e) => setCleaningOption(e.target.value)}>
          <FormControlLabel
            value="duplicates"
            control={
              <Radio
                sx={{
                  color: primaryColor,
                  '&.Mui-checked': {
                    color: primaryColor,
                  },
                }}
              />
            }
            label="Remove Duplicates"
            sx={{ color: '#ccc', mb: 1 }}
          />
          <FormControlLabel
            value="missing"
            control={
              <Radio
                sx={{
                  color: primaryColor,
                  '&.Mui-checked': {
                    color: primaryColor,
                  },
                }}
              />
            }
            label="Handle Missing Values"
            sx={{ color: '#ccc', mb: 1 }}
          />
          <FormControlLabel
            value="normalize"
            control={
              <Radio
                sx={{
                  color: primaryColor,
                  '&.Mui-checked': {
                    color: primaryColor,
                  },
                }}
              />
            }
            label="Normalize Data"
            sx={{ color: '#ccc' }}
          />
        </RadioGroup>
      </FormControl>

      {cleaningOption === 'missing' && (
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="missing-strategy-label" sx={{ color: '#999' }}>
              Missing Value Strategy
            </InputLabel>
            <Select
              labelId="missing-strategy-label"
              value={missingValueStrategy}
              onChange={(e) => setMissingValueStrategy(e.target.value)}
              label="Missing Value Strategy"
              sx={{
                color: '#fff',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1a1a1c',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: primaryColor,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: primaryColor,
                },
              }}
            >
              <MenuItem value="mean">Mean</MenuItem>
              <MenuItem value="median">Median</MenuItem>
              <MenuItem value="mode">Mode</MenuItem>
              <MenuItem value="drop">Drop Rows</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {cleaningOption === 'normalize' && (
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="normalize-method-label" sx={{ color: '#999' }}>
              Normalization Method
            </InputLabel>
            <Select
              labelId="normalize-method-label"
              value={normalizeMethod}
              onChange={(e) => setNormalizeMethod(e.target.value)}
              label="Normalization Method"
              sx={{
                color: '#fff',
                '.MuiOutlinedInput-notchedOutline': {
                  borderColor: '#1a1a1c',
                },
                '&:hover .MuiOutlinedInput-notchedOutline': {
                  borderColor: primaryColor,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: primaryColor,
                },
              }}
            >
              <MenuItem value="standard">Standard Scaler</MenuItem>
              <MenuItem value="minmax">Min-Max Scaler</MenuItem>
              <MenuItem value="robust">Robust Scaler</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}
    </Paper>
  );
};

export default DataCleaningConfig;

