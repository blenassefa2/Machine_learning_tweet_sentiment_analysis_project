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
  // KNN parameters
  kValue: number;
  setKValue: (value: number) => void;
  // Naive Bayes parameters
  ngram: string;
  setNgram: (value: string) => void;
  featureRep: string;
  setFeatureRep: (value: string) => void;
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
  kValue,
  setKValue,
  ngram,
  setNgram,
  featureRep,
  setFeatureRep,
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

      {/* KNN Parameters */}
      {learningModel === 'knn' && (
        <Box sx={{ mt: 2 }}>
          <Typography sx={{ color: '#ccc', mb: 1 }}>K (Neighbors): {kValue}</Typography>
          <Slider
            value={kValue}
            onChange={(_, val) => setKValue(val as number)}
            min={1}
            max={15}
            step={2}
            marks={[
              { value: 1, label: '1' },
              { value: 5, label: '5' },
              { value: 9, label: '9' },
              { value: 15, label: '15' },
            ]}
            sx={{ 
              color: primaryColor,
              '& .MuiSlider-markLabel': { color: '#666', fontSize: '0.75rem' }
            }}
          />
          <Typography sx={{ color: '#777', fontSize: '0.75rem', mt: 1 }}>
            Uses Jaccard distance for text similarity
          </Typography>
        </Box>
      )}

      {/* Naive Bayes Parameters */}
      {learningModel === 'naive_bayes' && (
        <Box sx={{ mt: 2 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="ngram-label" sx={{ color: '#999' }}>
              N-gram
            </InputLabel>
            <Select
              labelId="ngram-label"
              value={ngram}
              onChange={(e) => setNgram(e.target.value)}
              label="N-gram"
              sx={{
                color: '#fff',
                '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
              }}
            >
              <MenuItem value="unigram">Unigram (single words)</MenuItem>
              <MenuItem value="bigram">Bigram (word pairs)</MenuItem>
              <MenuItem value="trigram">Trigram (word triplets)</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel id="feature-label" sx={{ color: '#999' }}>
              Feature Representation
            </InputLabel>
            <Select
              labelId="feature-label"
              value={featureRep}
              onChange={(e) => setFeatureRep(e.target.value)}
              label="Feature Representation"
              sx={{
                color: '#fff',
                '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
              }}
            >
              <MenuItem value="count">Count (word frequency)</MenuItem>
              <MenuItem value="binary">Binary (presence only)</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Naive Automatic Info */}
      {learningModel === 'naive_automatic' && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: '#1a1a1c', borderRadius: 1 }}>
          <Typography sx={{ color: '#ccc', fontSize: '0.85rem' }}>
            Keyword-based classification using positive/negative word lists.
          </Typography>
          <Typography sx={{ color: '#777', fontSize: '0.75rem', mt: 1 }}>
            Labels: 0 (Negative), 2 (Neutral), 4 (Positive)
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default TrainingConfig;

