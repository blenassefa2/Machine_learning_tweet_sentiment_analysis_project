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
import { labelNaive } from '../api/classify';
import { trainModel } from '../api/training';
import type { CleaningOptions } from '../api/cleaning';

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
}

interface DataReviewProps {
  onJobStart: (jobId: string, jobType: 'cleaning' | 'classification' | 'training') => void;
  cleaningConfig?: {
    cleaningOption: string;
    normalizeMethod: string;
    missingValueStrategy: string;
  };
  classificationConfig?: {
    classifier: string;
    classifierParams: any;
  };
  trainingConfig?: {
    learningModel: string;
    testSplit: number;
    epochs: number;
    learningRate: number;
    batchSize: number;
    crossValidation: boolean;
    autoTune: boolean;
  };
}

const DataReview = ({
  onJobStart,
  cleaningConfig,
  classificationConfig,
  trainingConfig,
}: DataReviewProps) => {
  const { sessionId } = useSession();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
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
      
      if (cleaningConfig.cleaningOption === 'duplicates') {
        options.remove_duplicates = true;
      } else if (cleaningConfig.cleaningOption === 'missing') {
        options.missing_values = {
          strategy: cleaningConfig.missingValueStrategy as 'drop' | 'mean' | 'median' | 'mode',
        };
      } else if (cleaningConfig.cleaningOption === 'normalize') {
        options.normalize = cleaningConfig.normalizeMethod as 'minmax' | 'standard' | 'robust';
      }

      const result = await cleanDataset(datasetId, sessionId, options);
      onJobStart(result.job_id, 'cleaning');
    } catch (error) {
      console.error('Error starting cleaning job:', error);
    }
  };

  const handleClassify = async (datasetId: string) => {
    if (!classificationConfig || !sessionId) return;

    try {
      const result = await labelNaive(datasetId, {
        session_id: sessionId,
        use_default_keywords: true,
      });
      onJobStart(result.job_id, 'classification');
    } catch (error) {
      console.error('Error starting classification job:', error);
    }
  };

  const handleTrain = async (datasetId: string) => {
    if (!trainingConfig || !sessionId) return;

    try {
      // Map frontend classifier names to backend algorithm names
      const algorithmMap: Record<string, string> = {
        'naive-bayes': 'naive_bayes',
        'svm': 'svm',
        'random-forest': 'random_forest',
        'knn': 'knn',
      };

      const algorithm = classificationConfig?.classifier
        ? algorithmMap[classificationConfig.classifier] || classificationConfig.classifier
        : 'naive_bayes';

      const hyperparameters: Record<string, any> = {};
      
      if (classificationConfig?.classifierParams) {
        const params = classificationConfig.classifierParams;
        if (classificationConfig.classifier === 'svm') {
          hyperparameters.kernel = params.kernel;
          hyperparameters.C = params.cValue;
        } else if (classificationConfig.classifier === 'random-forest') {
          hyperparameters.n_estimators = params.nEstimators;
          hyperparameters.max_depth = params.maxDepth;
        } else if (classificationConfig.classifier === 'knn') {
          hyperparameters.n_neighbors = params.kNeighbors;
        }
      }

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

  const handleProcess = async (datasetId: string) => {
    // Process = Clean -> Classify -> Train in sequence
    try {
      await handleClean(datasetId);
      // Note: In a real implementation, you'd wait for cleaning to complete
      // before starting classification, and so on. This is a simplified version.
    } catch (error) {
      console.error('Error processing dataset:', error);
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
                      disabled={!cleaningConfig?.cleaningOption}
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
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleClassify(dataset.dataset_id)}
                      disabled={!classificationConfig?.classifier}
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
                      Classify
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleTrain(dataset.dataset_id)}
                      disabled={!trainingConfig?.learningModel}
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
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleProcess(dataset.dataset_id)}
                      disabled={!cleaningConfig?.cleaningOption || !classificationConfig?.classifier || !trainingConfig?.learningModel}
                      sx={{
                        backgroundColor: primaryColor,
                        color: '#fff',
                        textTransform: 'none',
                        '&:hover': {
                          backgroundColor: primaryColorDark,
                        },
                        '&:disabled': {
                          backgroundColor: '#444',
                          color: '#666',
                        },
                      }}
                    >
                      Process
                    </Button>
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
    </Box>
  );
};

export default DataReview;

