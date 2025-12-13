import { 
  Paper, 
  Box, 
  FormControl, 
  FormLabel, 
  RadioGroup, 
  FormControlLabel, 
  Radio, 
  Select, 
  MenuItem, 
  InputLabel,
  Checkbox,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
  IconButton,
  Snackbar,
  Alert
} from '@mui/material';
import { Add } from '@mui/icons-material';
import { Settings, ExpandMore } from '@mui/icons-material';
import { useState } from 'react';
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

export interface TextCleaningState {
  removeUrls: boolean;
  removeRetweets: boolean;
  removeHashtags: boolean;
  removeMentions: boolean;
  removeNumbers: boolean;
  removeHtmlTags: boolean;
  removeExtraSpaces: boolean;
  removeContradictoryEmojis: boolean;
  removeNotFrench: boolean;
  removeNotEnglish: boolean;
}

export interface ColumnValidationState {
  column: string;
  validationType: string;
  allowedValues: string;
  maxLength: string;
}

interface DataCleaningConfigProps {
  cleaningOption: string;
  setCleaningOption: (value: string) => void;
  missingValueStrategy: string;
  setMissingValueStrategy: (value: string) => void;
  textCleaning: TextCleaningState;
  setTextCleaning: (value: TextCleaningState) => void;
  columnValidations: ColumnValidationState[];
  setColumnValidations: (value: ColumnValidationState[]) => void;
  keepColumns: string;
  setKeepColumns: (value: string) => void;
}

const DataCleaningConfig = ({
  cleaningOption,
  setCleaningOption,
  missingValueStrategy,
  setMissingValueStrategy,
  textCleaning,
  setTextCleaning,
  columnValidations,
  setColumnValidations,
  keepColumns,
  setKeepColumns,
}: DataCleaningConfigProps) => {
  const primaryColor = '#646cff';
  const primaryColorDark = '#5058e6';
  const [currentColNum, setCurrentColNum] = useState<string>('');
  const [currentColName, setCurrentColName] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string>('');

  const updateTextCleaning = (field: keyof TextCleaningState, value: any) => {
    setTextCleaning({ ...textCleaning, [field]: value });
  };

  const confirmedColumns = keepColumns 
    ? keepColumns.split(',').filter(c => c.trim() && c.includes(':'))
    : [];

  const handleAddColumn = () => {
    if (!currentColNum.trim() || !currentColName.trim()) {
      setSnackbarMessage('Please fill both column number and name');
      setSnackbarOpen(true);
      return;
    }

    const newColumn = `${currentColNum.trim()}:${currentColName.trim()}`;
    const existingCols = confirmedColumns;
    existingCols.push(newColumn);
    setKeepColumns(existingCols.join(','));
    
    setSnackbarMessage(`Added column: ${currentColNum} → ${currentColName}`);
    setSnackbarOpen(true);
    
    // Clear inputs
    setCurrentColNum('');
    setCurrentColName('');
  };

  const handleRemoveColumn = (index: number) => {
    const cols = [...confirmedColumns];
    cols.splice(index, 1);
    setKeepColumns(cols.join(','));
  };

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

      {/* Basic Options */}
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
            sx={{ color: '#ccc' }}
          />
        </RadioGroup>
      </FormControl>

      {/* Missing Value Strategy */}
      {cleaningOption === 'missing' && (
        <Box sx={{ mt: 2, mb: 2 }}>
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
              <MenuItem value="fill_mean">Fill with Mean</MenuItem>
              <MenuItem value="fill_median">Fill with Median</MenuItem>
              <MenuItem value="fill_mode">Fill with Mode</MenuItem>
              <MenuItem value="fill_constant">Fill with Constant</MenuItem>
              <MenuItem value="drop_rows">Drop Rows</MenuItem>
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Keep Columns */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography sx={{ color: '#ccc', mb: 1, fontSize: '0.875rem' }}>
          Keep Columns
        </Typography>
        
        {/* Confirmed Columns Display */}
        {confirmedColumns.length > 0 && (
          <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {confirmedColumns.map((col, index) => {
              const parts = col.split(':');
              const colNum = parts[0];
              const colName = parts[1];
              return (
                <Chip
                  key={index}
                  label={`${colNum} → ${colName}`}
                  onDelete={() => handleRemoveColumn(index)}
                  sx={{
                    backgroundColor: '#1a1a1c',
                    color: '#fff',
                    border: '1px solid #2a2a2c',
                    '& .MuiChip-deleteIcon': {
                      color: '#999',
                      '&:hover': { color: '#fff' },
                    },
                  }}
                />
              );
            })}
          </Box>
        )}

        {/* Input Fields */}
        <Box sx={{ display: 'flex', gap: 1, mb: 1, alignItems: 'center' }}>
          <TextField
            label="Column Number"
            value={currentColNum}
            onChange={(e) => setCurrentColNum(e.target.value)}
            size="small"
            type="number"
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': { borderColor: '#1a1a1c' },
                '&:hover fieldset': { borderColor: primaryColor },
                '&.Mui-focused fieldset': { borderColor: primaryColor },
              },
              '& .MuiInputLabel-root': { color: '#999' },
            }}
          />
          <FormControl size="small" sx={{ flex: 1 }}>
            <InputLabel id="col-name-input" sx={{ color: '#999' }}>
              Column Name
            </InputLabel>
            <Select
              labelId="col-name-input"
              value={currentColName}
              onChange={(e) => setCurrentColName(e.target.value)}
              label="Column Name"
              sx={{
                color: '#fff',
                '.MuiOutlinedInput-notchedOutline': { borderColor: '#1a1a1c' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
              }}
            >
              <MenuItem value="tweet">Tweet</MenuItem>
              <MenuItem value="id">ID</MenuItem>
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="target">Target</MenuItem>
              <MenuItem value="username">Username</MenuItem>
              <MenuItem value="topic">Topic</MenuItem>
            </Select>
          </FormControl>
          <IconButton
            onClick={handleAddColumn}
            sx={{
              color: primaryColor,
              border: `1px solid ${primaryColor}`,
              '&:hover': {
                borderColor: primaryColorDark,
                backgroundColor: 'rgba(100, 108, 255, 0.1)',
              },
            }}
          >
            <Add />
          </IconButton>
        </Box>
      </Box>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          sx={{
            backgroundColor: '#1a1a1c',
            color: '#fff',
            '& .MuiAlert-icon': { color: primaryColor },
          }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* Text Cleaning Accordion */}
      <Accordion
        sx={{
          backgroundColor: 'transparent',
          boxShadow: 'none',
          border: '1px solid #1a1a1c',
          mb: 2,
          '&:before': { display: 'none' },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMore sx={{ color: primaryColor }} />}
          sx={{ color: '#fff' }}
        >
          <Typography sx={{ fontSize: '0.875rem' }}>Text Cleaning Options</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={textCleaning.removeUrls}
                  onChange={(e) => updateTextCleaning('removeUrls', e.target.checked)}
                  sx={{ color: primaryColor, '&.Mui-checked': { color: primaryColor } }}
                />
              }
              label="Remove URLs"
              sx={{ color: '#ccc' }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={textCleaning.removeRetweets}
                  onChange={(e) => updateTextCleaning('removeRetweets', e.target.checked)}
                  sx={{ color: primaryColor, '&.Mui-checked': { color: primaryColor } }}
                />
              }
              label="Remove Retweets"
              sx={{ color: '#ccc' }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={textCleaning.removeHashtags}
                  onChange={(e) => updateTextCleaning('removeHashtags', e.target.checked)}
                  sx={{ color: primaryColor, '&.Mui-checked': { color: primaryColor } }}
                />
              }
              label="Remove Hashtags"
              sx={{ color: '#ccc' }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={textCleaning.removeMentions}
                  onChange={(e) => updateTextCleaning('removeMentions', e.target.checked)}
                  sx={{ color: primaryColor, '&.Mui-checked': { color: primaryColor } }}
                />
              }
              label="Remove Mentions"
              sx={{ color: '#ccc' }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={textCleaning.removeContradictoryEmojis}
                  onChange={(e) => updateTextCleaning('removeContradictoryEmojis', e.target.checked)}
                  sx={{ color: primaryColor, '&.Mui-checked': { color: primaryColor } }}
                />
              }
              label="Remove Contradictory Emojis"
              sx={{ color: '#ccc' }}
            />
          </Box>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
};

export default DataCleaningConfig;
