import { 
  Paper, 
  Box, 
  FormControl, 
  FormLabel, 
  Select, 
  MenuItem, 
  InputLabel, 
  Typography, 
  Slider,
  RadioGroup,
  FormControlLabel,
  Radio,
  
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { Settings, ExpandMore } from '@mui/icons-material';
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

export interface LabelingParams {
  // Clustering params
  nClusters: number;
  linkage: string;
  eps: number;
  minSamples: number;
  randomState: number;
  // Naive params
  useDefaultKeywords: boolean;
  // Classify params (for future)
  kernel: string;
  cValue: number;
  nEstimators: number;
  maxDepth: number;
  kNeighbors: number;
}

interface LabelingConfigProps {
  labelingMethod: string;
  setLabelingMethod: (value: string) => void;
  labelingParams: LabelingParams;
  setLabelingParams: (params: LabelingParams) => void;
}

const LabelingConfig = ({
  labelingMethod,
  setLabelingMethod,
  labelingParams,
  setLabelingParams,
}: LabelingConfigProps) => {
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
          Labeling
        </FormLabel>
      </Box>

      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <RadioGroup value={labelingMethod} onChange={(e) => setLabelingMethod(e.target.value)}>
          <FormControlLabel
            value="manual"
            control={
              <Radio
                sx={{
                  color: primaryColor,
                  '&.Mui-checked': { color: primaryColor },
                }}
              />
            }
            label="Manual Labeling"
            sx={{ color: '#ccc', mb: 1 }}
          />
          <FormControlLabel
            value="naive"
            control={
              <Radio
                sx={{
                  color: primaryColor,
                  '&.Mui-checked': { color: primaryColor },
                }}
              />
            }
            label="Auto Naive (Keyword-based)"
            sx={{ color: '#ccc', mb: 1 }}
          />
          <FormControlLabel
            value="clustering"
            control={
              <Radio
                sx={{
                  color: primaryColor,
                  '&.Mui-checked': { color: primaryColor },
                }}
              />
            }
            label="Auto Clustering"
            sx={{ color: '#ccc', mb: 1 }}
          />
          <FormControlLabel
            value="classify"
            control={
              <Radio
                sx={{
                  color: primaryColor,
                  '&.Mui-checked': { color: primaryColor },
                }}
              />
            }
            label="Classify (ML-based)"
            sx={{ color: '#ccc' }}
          />
        </RadioGroup>
      </FormControl>

      {/* Manual Labeling Info */}
      {labelingMethod === 'manual' && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: '#1a1a1c', borderRadius: 1 }}>
          <Typography sx={{ color: '#999', fontSize: '0.875rem' }}>
            Manual labeling will open a modal where you can label tweets row by row.
            Select target values: 0 (Negative), 2 (Neutral), or 4 (Positive).
          </Typography>
        </Box>
      )}

      {/* Naive Labeling Options */}
      {labelingMethod === 'naive' && (
        <Box sx={{ mt: 2 }}>
          <FormControlLabel
            control={
              <Radio
                checked={labelingParams.useDefaultKeywords}
                onChange={(e) => setLabelingParams({ ...labelingParams, useDefaultKeywords: e.target.checked })}
                sx={{ color: primaryColor, '&.Mui-checked': { color: primaryColor } }}
              />
            }
            label="Use Default Keywords"
            sx={{ color: '#ccc' }}
          />
          <Typography sx={{ color: '#999', fontSize: '0.75rem', mt: 1, ml: 4 }}>
            Uses keywords from storage: keywords/positive.txt and keywords/negative.txt
          </Typography>
        </Box>
      )}

      {/* Clustering Options */}
      {labelingMethod === 'clustering' && (
        <Accordion
          sx={{
            backgroundColor: 'transparent',
            boxShadow: 'none',
            border: '1px solid #1a1a1c',
            mt: 2,
            '&:before': { display: 'none' },
          }}
        >
          <AccordionSummary
            expandIcon={<ExpandMore sx={{ color: primaryColor }} />}
            sx={{ color: '#fff' }}
          >
            <Typography sx={{ fontSize: '0.875rem' }}>Clustering Parameters</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControl fullWidth>
                <InputLabel id="linkage-label" sx={{ color: '#999' }}>Linkage Method</InputLabel>
                <Select
                  labelId="linkage-label"
                  value={labelingParams.linkage}
                  onChange={(e) => setLabelingParams({ ...labelingParams, linkage: e.target.value })}
                  label="Linkage Method"
                  sx={{
                    color: '#fff',
                    '.MuiOutlinedInput-notchedOutline': { borderColor: '#1a1a1c' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
                  }}
                >
                  <MenuItem value="average">Average</MenuItem>
                  <MenuItem value="complete">Complete</MenuItem>
                  <MenuItem value="ward">Ward</MenuItem>
                </Select>
              </FormControl>
              <Typography sx={{ color: '#ccc', mb: 1 }}>Number of Clusters: {labelingParams.nClusters}</Typography>
              <Slider
                value={labelingParams.nClusters}
                onChange={(_, val) => setLabelingParams({ ...labelingParams, nClusters: val as number })}
                min={2}
                max={10}
                sx={{ color: primaryColor }}
              />
            </Box>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Classify Options (for future ML-based classification) */}
      {labelingMethod === 'classify' && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: '#1a1a1c', borderRadius: 1 }}>
          <Typography sx={{ color: '#999', fontSize: '0.875rem' }}>
            ML-based classification coming soon. This will use trained models to label data.
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default LabelingConfig;

