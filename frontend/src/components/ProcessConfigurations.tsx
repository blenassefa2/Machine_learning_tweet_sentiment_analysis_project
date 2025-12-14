import { Box } from '@mui/material';
import DataCleaningConfig from './DataCleaningConfig';
import LabelingConfig from './LabelingConfig';
import TrainingConfig from './TrainingConfig';
import type { TextCleaningState, ColumnValidationState } from './DataCleaningConfig';
import type { LabelingParams } from './LabelingConfig';

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
  
  // Labeling
  labelingMethod: string;
  setLabelingMethod: (value: string) => void;
  labelingParams: LabelingParams;
  setLabelingParams: (params: LabelingParams) => void;
  
  // Training
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
        textCleaning={props.textCleaning}
        setTextCleaning={props.setTextCleaning}
        columnValidations={props.columnValidations}
        setColumnValidations={props.setColumnValidations}
        keepColumns={props.keepColumns}
        setKeepColumns={props.setKeepColumns}
      />
      <LabelingConfig
        labelingMethod={props.labelingMethod}
        setLabelingMethod={props.setLabelingMethod}
        labelingParams={props.labelingParams}
        setLabelingParams={props.setLabelingParams}
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
        kValue={props.kValue}
        setKValue={props.setKValue}
        ngram={props.ngram}
        setNgram={props.setNgram}
        featureRep={props.featureRep}
        setFeatureRep={props.setFeatureRep}
      />
    </Box>
  );
};

export default ProcessConfigurations;

