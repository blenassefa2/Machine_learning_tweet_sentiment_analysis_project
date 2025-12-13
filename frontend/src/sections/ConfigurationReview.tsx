import { useState } from 'react';
import {
  Box,
  Typography,
  Container,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { keyframes } from '@emotion/react';
import ProcessConfigurations from '../components/ProcessConfigurations';
import AdvancedSettings from '../components/AdvancedSettings';
import DataReview from '../components/DataReview';
import ProgressModal from '../components/ProgressModal';

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

  // Progress Modal State
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentJobType, setCurrentJobType] = useState<'cleaning' | 'classification' | 'training' | null>(null);

  const handleJobStart = (jobId: string, jobType: 'cleaning' | 'classification' | 'training') => {
    setCurrentJobId(jobId);
    setCurrentJobType(jobType);
    setProgressModalOpen(true);
  };

  const handleJobComplete = () => {
    // Refresh datasets or show success message
    console.log('Job completed successfully');
  };

  const handleCloseProgressModal = () => {
    setProgressModalOpen(false);
    setCurrentJobId(null);
    setCurrentJobType(null);
  };

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

          <ProcessConfigurations
            cleaningOption={cleaningOption}
            setCleaningOption={setCleaningOption}
            normalizeMethod={normalizeMethod}
            setNormalizeMethod={setNormalizeMethod}
            missingValueStrategy={missingValueStrategy}
            setMissingValueStrategy={setMissingValueStrategy}
            classifier={classifier}
            setClassifier={setClassifier}
            classifierParams={classifierParams}
            setClassifierParams={setClassifierParams}
            learningModel={learningModel}
            setLearningModel={setLearningModel}
            crossValidation={crossValidation}
            setCrossValidation={setCrossValidation}
            autoTune={autoTune}
            setAutoTune={setAutoTune}
            testSplit={testSplit}
            setTestSplit={setTestSplit}
            epochs={epochs}
            setEpochs={setEpochs}
            learningRate={learningRate}
            setLearningRate={setLearningRate}
            batchSize={batchSize}
            setBatchSize={setBatchSize}
          />

          {/* Advanced Settings Accordion */}
          <Box sx={{ mt: 4 }}>
            <AdvancedSettings
              enableAdvanced={enableAdvanced}
              setEnableAdvanced={setEnableAdvanced}
              randomState={randomState}
              setRandomState={setRandomState}
              earlyStopping={earlyStopping}
              setEarlyStopping={setEarlyStopping}
              patience={patience}
              setPatience={setPatience}
            />
          </Box>
        </Box>

        {/* Recent Uploads */}
        <DataReview
          onJobStart={handleJobStart}
          cleaningConfig={{
            cleaningOption,
            normalizeMethod,
            missingValueStrategy,
          }}
          classificationConfig={{
            classifier,
            classifierParams,
          }}
          trainingConfig={{
            learningModel,
            testSplit,
            epochs,
            learningRate,
            batchSize,
            crossValidation,
            autoTune,
          }}
        />
      </Container>

      {/* Progress Modal */}
      <ProgressModal
        open={progressModalOpen}
        jobId={currentJobId}
        jobType={currentJobType}
        onClose={handleCloseProgressModal}
        onComplete={handleJobComplete}
      />
    </Box>
  );
};

export default ConfigurationReview;
