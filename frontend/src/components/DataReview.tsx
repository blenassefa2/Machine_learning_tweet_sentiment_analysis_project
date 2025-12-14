import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Button,
  IconButton,
  Tooltip,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { Description, Refresh } from '@mui/icons-material';
import { keyframes } from '@emotion/react';
import { useSession } from '../context/SessionContext';
import { listDatasets } from '../api/datasets';
import { cleanDataset } from '../api/cleaning';
import { labelNaive, labelClustering, labelManual } from '../api/label';
import { trainModel } from '../api/training';
import { evaluateDataset } from '../api/evaluate';
import { predictDataset } from '../api/predict';
import type { PredictResponse } from '../api/predict';
import ManualLabelingModal from './ManualLabelingModal';
import type { CleaningOptions, MissingValueOption, ColumnValidationOptions } from '../api/cleaning';
import type { TextCleaningState, ColumnValidationState } from './DataCleaningConfig';
import type { LabelingParams } from './LabelingConfig';

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

interface Dataset {
  dataset_id: string;
  filename: string;
  uploaded_at?: string;
  size?: string;
  status?: string;
  cleaned_file?: string;
  labeled_file?: string;
}

interface DataReviewProps {
  onJobStart: (jobId: string, jobType: 'cleaning' | 'labeling' | 'training') => void;
  onEvaluate: (evaluation: any) => void;
  onPredict: (prediction: PredictResponse) => void;
  cleaningConfig?: {
    cleaningOption: string;
    missingValueStrategy: string;
    textCleaning?: TextCleaningState;
    columnValidations?: ColumnValidationState[];
    keepColumns?: string;
  };
  labelingConfig?: {
    labelingMethod: string;
    labelingParams: LabelingParams;
  };
  trainingConfig?: {
    learningModel: string;
    testSplit: number;
    crossValidation: boolean;
    autoTune: boolean;
    // KNN parameters
    kValue: number;
    // Naive Bayes parameters
    ngram: string;
    featureRep: string;
  };
}

const DataReview = ({
  onJobStart,
  onEvaluate,
  onPredict,
  cleaningConfig,
  labelingConfig,
  trainingConfig,
}: DataReviewProps) => {
  const { sessionId } = useSession();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [manualLabelingOpen, setManualLabelingOpen] = useState(false);
  const [currentLabelingDatasetId, setCurrentLabelingDatasetId] = useState<string | null>(null);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const primaryColor = '#646cff';
  const primaryColorDark = '#5058e6';

  const loadDatasets = useCallback(async (showRefreshState = false) => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    try {
      if (showRefreshState) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      const data = await listDatasets(sessionId);
      // Handle different possible response structures
      const datasetsList = Array.isArray(data) ? data : (data.recentUploads || data.datasets || []);
      setDatasets(datasetsList);
    } catch (error) {
      console.error('Error fetching datasets:', error);
      setDatasets([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadDatasets();
  }, [loadDatasets]);

  const handleRefresh = () => {
    loadDatasets(true);
  };

  const handleClean = async (datasetId: string) => {
    if (!cleaningConfig || !sessionId) return;

    try {
      const options: CleaningOptions = {};
      
      // Remove duplicates
      if (cleaningConfig.cleaningOption === 'duplicates') {
        options.remove_duplicates = true;
      }
      
      // Missing value handling
      if (cleaningConfig.cleaningOption === 'missing' ) {
        const strategyMap: Record<string, MissingValueOption['strategy']> = {
          'fill_mean': 'fill_mean',
          'fill_median': 'fill_median',
          'fill_mode': 'fill_mode',
          'fill_constant': 'fill_constant',
          'drop_rows': 'drop_rows',
        };
        
        const strategy = strategyMap['drop_rows'];
        options.missing_value_options = [{
          strategy,
        }];
      }
      
      // Keep columns - parse "number:name" format, send as list of dicts with index and name
      if (cleaningConfig.keepColumns && cleaningConfig.keepColumns.trim()) {
        const columnPairs = cleaningConfig.keepColumns
          .split(',')
          .map(col => col.trim())
          .filter(col => col.length > 0 && col.includes(':'))
          .map(col => {
            const parts = col.split(':').map(s => s.trim());
            const colNum = parseInt(parts[0]);
            const name = parts[1];
            // Validate name is from allowed enum
            const allowedNames = ['tweet', 'id', 'date', 'target', 'username', 'topic'];
            if (!isNaN(colNum) && allowedNames.includes(name)) {
              return { index: colNum, name: name };
            }
            return null;
          })
          .filter((item): item is { index: number; name: string } => item !== null);
        
        if (columnPairs.length > 0) {
          options.keep_columns = columnPairs;
        }
      }
      
      // Text cleaning - automatically use "tweet" column if it's in keepColumns
      const hasTextCleaningOptions = cleaningConfig.textCleaning && (
        cleaningConfig.textCleaning.removeUrls ||
        cleaningConfig.textCleaning.removeRetweets ||
        cleaningConfig.textCleaning.removeHashtags ||
        cleaningConfig.textCleaning.removeMentions ||
        cleaningConfig.textCleaning.removeContradictoryEmojis
      );
      
      if (hasTextCleaningOptions) {
        // Find "tweet" column index from keepColumns
        const keepCols = options.keep_columns as { index: number; name: string }[] | undefined;
        let tweetColumnIndex: number | null = null;
        if (keepCols && Array.isArray(keepCols)) {
          const tweetCol = keepCols.find(col => col.name === 'tweet');
          if (tweetCol) {
            tweetColumnIndex = tweetCol.index;
          }
        }
        
        // Use tweet column index if found, otherwise default to 0 (first column)
        const textColumnIndex = tweetColumnIndex !== null ? tweetColumnIndex : 0;
        
        options.text_cleaning = {
          text_columns: [textColumnIndex.toString()], // Send as string, will be converted to int
          remove_urls: cleaningConfig.textCleaning?.removeUrls ?? true,
          remove_retweets: cleaningConfig.textCleaning?.removeRetweets ?? true,
          remove_hashtags: cleaningConfig.textCleaning?.removeHashtags ?? true,
          remove_mentions: cleaningConfig.textCleaning?.removeMentions ?? true,
          remove_numbers: cleaningConfig.textCleaning?.removeNumbers ?? false,
          remove_html_tags: cleaningConfig.textCleaning?.removeHtmlTags ?? true,
          remove_extra_spaces: cleaningConfig.textCleaning?.removeExtraSpaces ?? true,
          remove_contradictory_emojis: cleaningConfig.textCleaning?.removeContradictoryEmojis ?? true,
          remove_not_french: cleaningConfig.textCleaning?.removeNotFrench ?? false,
          remove_not_english: cleaningConfig.textCleaning?.removeNotEnglish ?? false,
        };
      }
      
      // Column validations
      if (cleaningConfig.columnValidations && cleaningConfig.columnValidations.length > 0) {
        options.column_validations = cleaningConfig.columnValidations
          .filter(v => v.column && v.validationType)
          .map(v => {
            const validation: ColumnValidationOptions = {
              column: v.column,
              validation_type: v.validationType as ColumnValidationOptions['validation_type'],
            };
            
            if (v.validationType === 'polarity' && v.allowedValues) {
              validation.allowed_values = v.allowedValues
                .split(',')
                .map(val => parseInt(val.trim()))
                .filter(val => !isNaN(val));
            }
            
            if (v.validationType === 'max_length' && v.maxLength) {
              validation.max_length = parseInt(v.maxLength);
            }
            
            return validation;
          })
          .filter(v => v.column && v.validation_type);
      }

      const result = await cleanDataset(datasetId, sessionId, options);
      onJobStart(result.job_id, 'cleaning');
    } catch (error) {
      console.error('Error starting cleaning job:', error);
    }
  };

  const handleLabel = async (datasetId: string) => {
    if (!labelingConfig || !sessionId) return;

    try {
      const { labelingMethod, labelingParams } = labelingConfig;
      let result;

      if (labelingMethod === 'manual') {
        // Open manual labeling modal
        setCurrentLabelingDatasetId(datasetId);
        setManualLabelingOpen(true);
        return; // Don't start job yet, modal will handle it
      } else if (labelingMethod === 'naive') {
        result = await labelNaive(datasetId, {
          session_id: sessionId,
          use_default_keywords: labelingParams.useDefaultKeywords,
        });
      } else if (labelingMethod === 'clustering') {
        const algo = (labelingParams.clusteringAlgorithm || 'kmeans') as 'kmeans' | 'hierarchical' | 'agglomerative' | 'dbscan';
        const hyperparameters: Record<string, any> = {
          random_state: labelingParams.randomState,
        };
        
        // Add algorithm-specific hyperparameters
        if (['kmeans', 'hierarchical', 'agglomerative'].includes(algo)) {
          hyperparameters.n_clusters = labelingParams.nClusters;
        }
        if (['hierarchical', 'agglomerative'].includes(algo)) {
          hyperparameters.linkage = labelingParams.linkage;
        }
        if (algo === 'dbscan') {
          hyperparameters.eps = labelingParams.eps;
          hyperparameters.min_samples = labelingParams.minSamples;
        }
        
        result = await labelClustering(datasetId, {
          session_id: sessionId,
          algorithm: algo,
          hyperparameters,
        });
      } else if (labelingMethod === 'classify') {
        // Future: ML-based classification
        throw new Error('Classify method not yet implemented');
      } else {
        throw new Error('Unknown labeling method');
      }

      onJobStart(result.job_id, 'labeling');
    } catch (error) {
      console.error('Error starting labeling job:', error);
    }
  };

  const handleTrain = async (datasetId: string) => {
    if (!trainingConfig || !sessionId || !trainingConfig.learningModel) return;

    try {
      const algorithm = trainingConfig.learningModel; // Already matches backend format
      const hyperparameters: Record<string, any> = {};

      // Add algorithm-specific hyperparameters
      if (algorithm === 'knn') {
        hyperparameters.k = trainingConfig.kValue || 5;
      } else if (algorithm === 'naive_bayes') {
        hyperparameters.ngram = trainingConfig.ngram || 'unigram';
        hyperparameters.feature_rep = trainingConfig.featureRep || 'count';
      }
      // naive_automatic doesn't need hyperparameters

      const result = await trainModel({
        dataset_id: datasetId,
        session_id: sessionId,
        algorithm,
        hyperparameters: Object.keys(hyperparameters).length > 0 ? hyperparameters : undefined,
        test_size: trainingConfig.testSplit / 100,
      });
      onJobStart(result.job_id, 'training');
    } catch (error) {
      console.error('Error starting training job:', error);
    }
  };

  const handleEvaluate = async (datasetId: string) => {
    if (!sessionId) return;

    try {
      const evaluation = await evaluateDataset(datasetId, sessionId);
      onEvaluate(evaluation);
    } catch (error: any) {
      console.error('Error fetching evaluation:', error);
      // Show error message to user
      if (error.response?.status === 404) {
        alert('No trained model found for this dataset. Please train a model first.');
      } else {
        alert(error.response?.data?.detail || 'Failed to get evaluation metrics.');
      }
    }
  };

  const handlePredict = async (datasetId: string) => {
    if (!sessionId) return;

    try {
      const prediction = await predictDataset(datasetId, sessionId);
      onPredict(prediction);
    } catch (error: any) {
      console.error('Error predicting:', error);
      const message = error.response?.data?.detail || 'Prediction failed.';
      alert(message);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown date';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography sx={{ color: '#ccc' }}>Loading datasets...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        animation: `${fadeInUp} 0.8s ease-out 0.8s both`,
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          mb: 4,
        }}
      >
        <Typography
          variant={isMobile ? 'h5' : 'h4'}
          component="h2"
          sx={{
            fontWeight: 600,
            color: '#fff',
            textAlign: 'center',
          }}
        >
          Recent Uploads
        </Typography>
        <Tooltip title="Refresh datasets">
          <IconButton
            onClick={handleRefresh}
            disabled={isRefreshing}
            sx={{
              color: primaryColor,
              '&:hover': {
                backgroundColor: 'rgba(100, 108, 255, 0.1)',
              },
              '&:disabled': {
                color: '#666',
              },
            }}
          >
            {isRefreshing ? (
              <CircularProgress size={24} sx={{ color: primaryColor }} />
            ) : (
              <Refresh />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      <Paper
        sx={{
          backgroundColor: '#0f0f11',
          border: '1px solid #1a1a1c',
        }}
      >
        {datasets.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography sx={{ color: '#999' }}>No datasets uploaded yet.</Typography>
          </Box>
        ) : (
          <List>
            {datasets.map((dataset, index) => (
              <Box key={dataset.dataset_id || index}>
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
                      primary={dataset.filename || `Dataset ${dataset.dataset_id}`}
                      secondary={`Uploaded on ${formatDate(dataset.uploaded_at)} ${dataset.size ? `• ${dataset.size}` : ''}`}
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
                      onClick={() => handleClean(dataset.dataset_id)}
                      disabled={
                        !cleaningConfig?.cleaningOption &&
                        (!cleaningConfig?.textCleaning || 
                         (!cleaningConfig.textCleaning.removeUrls &&
                          !cleaningConfig.textCleaning.removeRetweets &&
                          !cleaningConfig.textCleaning.removeHashtags &&
                          !cleaningConfig.textCleaning.removeMentions &&
                          !cleaningConfig.textCleaning.removeContradictoryEmojis)) &&
                        (!cleaningConfig?.columnValidations || cleaningConfig.columnValidations.length === 0) &&
                        !cleaningConfig?.keepColumns
                      }
                      sx={{
                        borderColor: primaryColor,
                        color: primaryColor,
                        textTransform: 'none',
                        '&:hover': {
                          borderColor: primaryColorDark,
                          backgroundColor: 'rgba(100, 108, 255, 0.1)',
                        },
                        '&:disabled': {
                          borderColor: '#444',
                          color: '#666',
                        },
                      }}
                    >
                      Clean
                    </Button>
                    <Tooltip 
                      title={
                        !dataset.cleaned_file 
                          ? "Dataset must be cleaned before labeling" 
                          : !labelingConfig?.labelingMethod 
                            ? "Select a labeling method first"
                            : ""
                      }
                    >
                      <span>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleLabel(dataset.dataset_id)}
                          disabled={!labelingConfig?.labelingMethod || !dataset.cleaned_file}
                          sx={{
                            borderColor: primaryColor,
                            color: primaryColor,
                            textTransform: 'none',
                            '&:hover': {
                              borderColor: primaryColorDark,
                              backgroundColor: 'rgba(100, 108, 255, 0.1)',
                            },
                            '&:disabled': {
                              borderColor: '#444',
                              color: '#666',
                            },
                          }}
                        >
                          Label
                        </Button>
                      </span>
                    </Tooltip>
                    <Tooltip 
                      title={
                        !dataset.cleaned_file 
                          ? "Dataset must be cleaned before training" 
                          : !trainingConfig?.learningModel 
                            ? "Select a training model first"
                            : ""
                      }
                    >
                      <span>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleTrain(dataset.dataset_id)}
                          disabled={!dataset.cleaned_file || !trainingConfig?.learningModel}
                          sx={{
                            borderColor: primaryColor,
                            color: primaryColor,
                            textTransform: 'none',
                            '&:hover': {
                              borderColor: primaryColorDark,
                              backgroundColor: 'rgba(100, 108, 255, 0.1)',
                            },
                            '&:disabled': {
                              borderColor: '#444',
                              color: '#666',
                            },
                          }}
                        >
                          Train
                        </Button>
                      </span>
                    </Tooltip>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleEvaluate(dataset.dataset_id)}
                      sx={{
                        backgroundColor: '#4caf50',
                        color: '#fff',
                        textTransform: 'none',
                        '&:hover': {
                          backgroundColor: '#388e3c',
                        },
                      }}
                    >
                      Evaluate
                    </Button>
                    <Tooltip title="Predict using trained model">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handlePredict(dataset.dataset_id)}
                        sx={{
                          backgroundColor: '#ff9800',
                          color: '#fff',
                          textTransform: 'none',
                          '&:hover': {
                            backgroundColor: '#f57c00',
                          },
                        }}
                      >
                        Predict
                      </Button>
                    </Tooltip>
                  </Box>
                </ListItem>
                {index < datasets.length - 1 && (
                  <Divider sx={{ borderColor: '#1a1a1c' }} />
                )}
              </Box>
            ))}
          </List>
        )}
      </Paper>

      {/* Manual Labeling Modal */}
      <ManualLabelingModal
        open={manualLabelingOpen}
        datasetId={currentLabelingDatasetId}
        onClose={() => {
          setManualLabelingOpen(false);
          setCurrentLabelingDatasetId(null);
        }}
        onComplete={async (jobId: string) => {
          onJobStart(jobId, 'labeling');
          setManualLabelingOpen(false);
          setCurrentLabelingDatasetId(null);
        }}
        onStopEarly={async (annotations) => {
          if (currentLabelingDatasetId && sessionId) {
            try {
              const result = await labelManual(currentLabelingDatasetId, {
                session_id: sessionId,
                annotations,
                stop_early: true,
              });
              onJobStart(result.job_id, 'labeling');
            } catch (error) {
              console.error('Error starting manual labeling job:', error);
            }
          }
          setManualLabelingOpen(false);
          setCurrentLabelingDatasetId(null);
        }}
      />
    </Box>
  );
};

export default DataReview;

