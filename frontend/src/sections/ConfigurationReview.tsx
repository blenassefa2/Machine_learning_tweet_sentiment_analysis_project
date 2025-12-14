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
import DataReview from '../components/DataReview';
import ProgressModal from '../components/ProgressModal';
import EvaluationModal from '../components/EvaluationModal';
import PredictionModal from '../components/PredictionModal';
import type { TextCleaningState, ColumnValidationState } from '../components/DataCleaningConfig';
import type { LabelingParams } from '../components/LabelingConfig';
import type { EvaluationResponse } from '../api/evaluate';
import type { PredictResponse } from '../api/predict';

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
    clusteringAlgorithm: 'kmeans',
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
  // KNN parameters
  const [kValue, setKValue] = useState(5);
  // Naive Bayes parameters
  const [ngram, setNgram] = useState('unigram');
  const [featureRep, setFeatureRep] = useState('count');

  // Progress Modal State
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [currentJobType, setCurrentJobType] = useState<'cleaning' | 'labeling' | 'training' | null>(null);

  // Evaluation Modal State
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
  const [evaluationData, setEvaluationData] = useState<EvaluationResponse | null>(null);

  // Prediction Modal State
  const [predictionModalOpen, setPredictionModalOpen] = useState(false);
  const [predictionData, setPredictionData] = useState<PredictResponse | null>(null);

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

  const handlePredict = (prediction: PredictResponse) => {
    setPredictionData(prediction);
    setPredictionModalOpen(true);
  };

  const handleClosePredictionModal = () => {
    setPredictionModalOpen(false);
    setPredictionData(null);
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
            kValue={kValue}
            setKValue={setKValue}
            ngram={ngram}
            setNgram={setNgram}
            featureRep={featureRep}
            setFeatureRep={setFeatureRep}
          />

          {/* Advanced Settings Accordion */}
         
        </Box>

        {/* Recent Uploads */}
        <DataReview
          onJobStart={handleJobStart}
          onEvaluate={handleEvaluate}
          onPredict={handlePredict}
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
            crossValidation,
            autoTune,
            kValue,
            ngram,
            featureRep,
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

      {/* Prediction Modal */}
      <PredictionModal
        open={predictionModalOpen}
        prediction={predictionData}
        onClose={handleClosePredictionModal}
      />
    </Box>
  );
};

export default ConfigurationReview;
