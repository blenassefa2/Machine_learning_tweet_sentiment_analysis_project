import { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  Paper,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  InputLabel,
  Checkbox,
  Button,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Switch,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Description, ExpandMore, Settings } from '@mui/icons-material';
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

const fadeIn = keyframes`
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
`;

const ConfigurationReview = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const primaryColor = '#646cff';
  const primaryColorDark = '#5058e6';

  // Data Cleaning State
  const [cleaningOption, setCleaningOption] = useState('');
  const [normalizeMethod, setNormalizeMethod] = useState('');
  const [missingValueStrategy, setMissingValueStrategy] = useState('mean');

  // Classification State
  const [classifier, setClassifier] = useState('');
  const [classifierParams, setClassifierParams] = useState({
    kernel: 'rbf',
    cValue: 1.0,
    gamma: 'scale',
    nEstimators: 100,
    maxDepth: 10,
    kNeighbors: 5,
  });

  // Model Training State
  const [learningModel, setLearningModel] = useState('');
  const [crossValidation, setCrossValidation] = useState(true);
  const [autoTune, setAutoTune] = useState(false);
  const [testSplit, setTestSplit] = useState(20);
  const [epochs, setEpochs] = useState(100);
  const [learningRate, setLearningRate] = useState(0.001);
  const [batchSize, setBatchSize] = useState(32);

  // Advanced Settings
  const [enableAdvanced, setEnableAdvanced] = useState(false);
  const [randomState, setRandomState] = useState(42);
  const [earlyStopping, setEarlyStopping] = useState(false);
  const [patience, setPatience] = useState(10);

  const recentUploads = [
    {
      name: 'customer_data.csv',
      date: 'Jan 15, 2025',
      size: '1.8 MB',
    },
    {
      name: 'text_samples.txt',
      date: 'Jan 14, 2025',
      size: '543 KB',
    },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: { xs: 6, md: 10 },
        animation: `${fadeIn} 0.6s ease-in`,
      }}
    >
      <Container maxWidth="lg" sx={{ width: '100%' }}>
        {/* Pipeline Configuration */}
        <Box sx={{ mb: 8 }}>
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            component="h2"
            sx={{
              fontWeight: 600,
              mb: 4,
              color: '#fff',
              textAlign: 'center',
              animation: `${fadeInUp} 0.8s ease-out`,
            }}
          >
            Pipeline Configuration
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
              gap: 3,
            }}
          >
            {/* Data Cleaning */}
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
                  <FormLabel
                    component="legend"
                    sx={{ color: '#fff', fontWeight: 600 }}
                  >
                    Data Cleaning
                  </FormLabel>
                </Box>
                <FormControl component="fieldset" sx={{ mb: 2 }}>
                  <RadioGroup
                    value={cleaningOption}
                    onChange={(e) => setCleaningOption(e.target.value)}
                  >
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

                {/* Advanced Cleaning Options */}
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

            {/* Classification */}
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
                  <FormLabel
                    component="legend"
                    sx={{ color: '#fff', fontWeight: 600 }}
                  >
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

                {/* Classifier-specific parameters */}
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

            {/* Model Training */}
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
                  <FormLabel
                    component="legend"
                    sx={{ color: '#fff', fontWeight: 600 }}
                  >
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
                    <MenuItem value="linear">Linear Regression</MenuItem>
                    <MenuItem value="logistic">Logistic Regression</MenuItem>
                    <MenuItem value="decision-tree">Decision Tree</MenuItem>
                    <MenuItem value="neural-network">Neural Network</MenuItem>
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

                {/* Training Parameters */}
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
                    {learningModel === 'neural-network' && (
                      <>
                        <Typography sx={{ color: '#ccc', mb: 1, mt: 2 }}>Epochs: {epochs}</Typography>
                        <Slider
                          value={epochs}
                          onChange={(_, val) => setEpochs(val as number)}
                          min={10}
                          max={500}
                          step={10}
                          sx={{ color: primaryColor }}
                        />
                        <Typography sx={{ color: '#ccc', mb: 1, mt: 2 }}>Learning Rate: {learningRate}</Typography>
                        <Slider
                          value={learningRate}
                          onChange={(_, val) => setLearningRate(val as number)}
                          min={0.0001}
                          max={0.1}
                          step={0.0001}
                          sx={{ color: primaryColor }}
                        />
                        <Typography sx={{ color: '#ccc', mb: 1, mt: 2 }}>Batch Size: {batchSize}</Typography>
                        <Slider
                          value={batchSize}
                          onChange={(_, val) => setBatchSize(val as number)}
                          min={16}
                          max={128}
                          step={16}
                          sx={{ color: primaryColor }}
                        />
                      </>
                    )}
                  </Box>
                )}
              </Paper>
          </Box>

          {/* Advanced Settings Accordion */}
          <Box sx={{ mt: 4 }}>
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
          </Box>
        </Box>

        {/* Recent Uploads */}
        <Box
          sx={{
            animation: `${fadeInUp} 0.8s ease-out 0.8s both`,
          }}
        >
          <Typography
            variant={isMobile ? 'h5' : 'h4'}
            component="h2"
            sx={{
              fontWeight: 600,
              mb: 4,
              color: '#fff',
              textAlign: 'center',
            }}
          >
            Recent Uploads
          </Typography>

          <Paper
            sx={{
              backgroundColor: '#0f0f11',
              border: '1px solid #1a1a1c',
            }}
          >
            <List>
              {recentUploads.map((file, index) => (
                <Box key={file.name}>
                  <ListItem
                    sx={{
                      display: 'flex',
                      flexDirection: { xs: 'column', sm: 'row' },
                      justifyContent: 'space-between',
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: { xs: 2, sm: 0 },
                      py: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: { xs: '100%', sm: 'auto' } }}>
                      <ListItemIcon>
                        <Description sx={{ color: primaryColor, fontSize: { xs: 28, md: 32 } }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={file.name}
                        secondary={`Uploaded on ${file.date} • ${file.size}`}
                        primaryTypographyProps={{
                          sx: { color: '#fff', fontWeight: 500 },
                        }}
                        secondaryTypographyProps={{
                          sx: { color: '#999' },
                        }}
                      />
                    </Box>
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1,
                        flexWrap: 'wrap',
                        width: { xs: '100%', sm: 'auto' },
                      }}
                    >
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{
                          borderColor: primaryColor,
                          color: primaryColor,
                          textTransform: 'none',
                          '&:hover': {
                            borderColor: primaryColorDark,
                            backgroundColor: 'rgba(100, 108, 255, 0.1)',
                          },
                        }}
                      >
                        Clean
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{
                          borderColor: primaryColor,
                          color: primaryColor,
                          textTransform: 'none',
                          '&:hover': {
                            borderColor: primaryColorDark,
                            backgroundColor: 'rgba(100, 108, 255, 0.1)',
                          },
                        }}
                      >
                        Classify
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{
                          borderColor: primaryColor,
                          color: primaryColor,
                          textTransform: 'none',
                          '&:hover': {
                            borderColor: primaryColorDark,
                            backgroundColor: 'rgba(100, 108, 255, 0.1)',
                          },
                        }}
                      >
                        Train
                      </Button>
                      <Button
                        variant="contained"
                        size="small"
                        sx={{
                          backgroundColor: primaryColor,
                          color: '#fff',
                          textTransform: 'none',
                          '&:hover': {
                            backgroundColor: primaryColorDark,
                          },
                        }}
                      >
                        Process
                      </Button>
                    </Box>
                  </ListItem>
                  {index < recentUploads.length - 1 && (
                    <Divider sx={{ borderColor: '#1a1a1c' }} />
                  )}
                </Box>
              ))}
            </List>
          </Paper>
        </Box>
      </Container>
    </Box>
  );
};

export default ConfigurationReview;
