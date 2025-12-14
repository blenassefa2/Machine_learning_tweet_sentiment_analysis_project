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
import EvaluationModal from '../components/EvaluationModal';
import type { TextCleaningState, ColumnValidationState } from '../components/DataCleaningConfig';
import type { LabelingParams } from '../components/LabelingConfig';
import type { EvaluationResponse } from '../api/evaluate';

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
  const [missingValueStrategy, setMissingValueStrategy] = useState('fill_mean');
  const [keepColumns, setKeepColumns] = useState('');
  const [textCleaning, setTextCleaning] = useState<TextCleaningState>({
    removeUrls: true,
    removeRetweets: true,
    removeHashtags: true,
    removeMentions: true,
    removeNumbers: false,
    removeHtmlTags: true,
    removeExtraSpaces: true,
    removeContradictoryEmojis: true,
    removeNotFrench: false,
    removeNotEnglish: false,
  });
  const [columnValidations, setColumnValidations] = useState<ColumnValidationState[]>([]);

  // Labeling State
  const [labelingMethod, setLabelingMethod] = useState('');
  const [labelingParams, setLabelingParams] = useState<LabelingParams>({
    nClusters: 3,
    linkage: 'average',
    eps: 0.5,
    minSamples: 5,
    randomState: 42,
    useDefaultKeywords: false,
    kernel: 'rbf',
    cValue: 1.0,
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
  const [currentJobType, setCurrentJobType] = useState<'cleaning' | 'labeling' | 'training' | null>(null);

  // Evaluation Modal State
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
  const [evaluationData, setEvaluationData] = useState<EvaluationResponse | null>(null);

  const handleJobStart = (jobId: string, jobType: 'cleaning' | 'labeling' | 'training') => {
    setCurrentJobId(jobId);
    setCurrentJobType(jobType);
    setProgressModalOpen(true);
  };

  const handleEvaluate = (evaluation: EvaluationResponse) => {
    setEvaluationData(evaluation);
    setEvaluationModalOpen(true);
  };

  const handleCloseEvaluationModal = () => {
    setEvaluationModalOpen(false);
    setEvaluationData(null);
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
            missingValueStrategy={missingValueStrategy}
            setMissingValueStrategy={setMissingValueStrategy}
            textCleaning={textCleaning}
            setTextCleaning={setTextCleaning}
            columnValidations={columnValidations}
            setColumnValidations={setColumnValidations}
            keepColumns={keepColumns}
            setKeepColumns={setKeepColumns}
            labelingMethod={labelingMethod}
            setLabelingMethod={setLabelingMethod}
            labelingParams={labelingParams}
            setLabelingParams={setLabelingParams}
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
          onEvaluate={handleEvaluate}
          cleaningConfig={{
            cleaningOption,
            missingValueStrategy,
            textCleaning,
            columnValidations,
            keepColumns,
          }}
          labelingConfig={{
            labelingMethod,
            labelingParams,
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

      {/* Evaluation Modal */}
      <EvaluationModal
        open={evaluationModalOpen}
        evaluation={evaluationData}
        onClose={handleCloseEvaluationModal}
      />
    </Box>
  );
};

export default ConfigurationReview;
