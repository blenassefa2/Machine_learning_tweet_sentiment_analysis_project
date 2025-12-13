import { Box } from '@mui/material';
import DataCleaningConfig from './DataCleaningConfig';
import ClassificationConfig from './ClassificationConfig';
import TrainingConfig from './TrainingConfig';
import type { TextCleaningState, ColumnValidationState } from './DataCleaningConfig';

interface ProcessConfigurationsProps {
  // Data Cleaning
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
  
  // Classification
  classifier: string;
  setClassifier: (value: string) => void;
  classifierParams: {
    kernel: string;
    cValue: number;
    gamma: string;
    nEstimators: number;
    maxDepth: number;
    kNeighbors: number;
  };
  setClassifierParams: (params: any) => void;
  
  // Training
  learningModel: string;
  setLearningModel: (value: string) => void;
  crossValidation: boolean;
  setCrossValidation: (value: boolean) => void;
  autoTune: boolean;
  setAutoTune: (value: boolean) => void;
  testSplit: number;
  setTestSplit: (value: number) => void;
  epochs: number;
  setEpochs: (value: number) => void;
  learningRate: number;
  setLearningRate: (value: number) => void;
  batchSize: number;
  setBatchSize: (value: number) => void;
}

const ProcessConfigurations = (props: ProcessConfigurationsProps) => {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' },
        gap: 3,
      }}
    >
      <DataCleaningConfig
        cleaningOption={props.cleaningOption}
        setCleaningOption={props.setCleaningOption}
        missingValueStrategy={props.missingValueStrategy}
        setMissingValueStrategy={props.setMissingValueStrategy}
        textCleaning={props.textCleaning}
        setTextCleaning={props.setTextCleaning}
        columnValidations={props.columnValidations}
        setColumnValidations={props.setColumnValidations}
        keepColumns={props.keepColumns}
        setKeepColumns={props.setKeepColumns}
      />
      <ClassificationConfig
        classifier={props.classifier}
        setClassifier={props.setClassifier}
        classifierParams={props.classifierParams}
        setClassifierParams={props.setClassifierParams}
      />
      <TrainingConfig
        learningModel={props.learningModel}
        setLearningModel={props.setLearningModel}
        crossValidation={props.crossValidation}
        setCrossValidation={props.setCrossValidation}
        autoTune={props.autoTune}
        setAutoTune={props.setAutoTune}
        testSplit={props.testSplit}
        setTestSplit={props.setTestSplit}
        epochs={props.epochs}
        setEpochs={props.setEpochs}
        learningRate={props.learningRate}
        setLearningRate={props.setLearningRate}
        batchSize={props.batchSize}
        setBatchSize={props.setBatchSize}
      />
    </Box>
  );
};

export default ProcessConfigurations;

