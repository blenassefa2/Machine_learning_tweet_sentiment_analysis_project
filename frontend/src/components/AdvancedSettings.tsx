import { Accordion, AccordionSummary, AccordionDetails, Box, TextField, FormControlLabel, Switch, Typography, Slider } from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

interface AdvancedSettingsProps {
  enableAdvanced: boolean;
  setEnableAdvanced: (value: boolean) => void;
  randomState: number;
  setRandomState: (value: number) => void;
  earlyStopping: boolean;
  setEarlyStopping: (value: boolean) => void;
  patience: number;
  setPatience: (value: number) => void;
}

const AdvancedSettings = ({
  enableAdvanced,
  setEnableAdvanced,
  randomState,
  setRandomState,
  earlyStopping,
  setEarlyStopping,
  patience,
  setPatience,
}: AdvancedSettingsProps) => {
  const primaryColor = '#646cff';

  return (
    <Accordion
      expanded={enableAdvanced}
      onChange={() => setEnableAdvanced(!enableAdvanced)}
      sx={{
        backgroundColor: '#0f0f11',
        border: '1px solid #1a1a1c',
        '&:before': {
          display: 'none',
        },
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMore sx={{ color: primaryColor }} />}
        sx={{ color: '#fff' }}
      >
        <Typography sx={{ fontWeight: 600 }}>Advanced Configuration</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
            gap: 3,
          }}
        >
          <TextField
            label="Random State"
            type="number"
            value={randomState}
            onChange={(e) => setRandomState(Number(e.target.value))}
            fullWidth
            sx={{
              '& .MuiOutlinedInput-root': {
                color: '#fff',
                '& fieldset': {
                  borderColor: '#1a1a1c',
                },
                '&:hover fieldset': {
                  borderColor: primaryColor,
                },
                '&.Mui-focused fieldset': {
                  borderColor: primaryColor,
                },
              },
              '& .MuiInputLabel-root': {
                color: '#999',
              },
            }}
          />
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={earlyStopping}
                  onChange={(e) => setEarlyStopping(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: primaryColor,
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: primaryColor,
                    },
                  }}
                />
              }
              label="Early Stopping"
              sx={{ color: '#ccc', mt: 1 }}
            />
            {earlyStopping && (
              <Box sx={{ mt: 2 }}>
                <Typography sx={{ color: '#ccc', mb: 1 }}>Patience: {patience}</Typography>
                <Slider
                  value={patience}
                  onChange={(_, val) => setPatience(val as number)}
                  min={5}
                  max={50}
                  step={5}
                  sx={{ color: primaryColor }}
                />
              </Box>
            )}
          </Box>
        </Box>
      </AccordionDetails>
    </Accordion>
  );
};

export default AdvancedSettings;

