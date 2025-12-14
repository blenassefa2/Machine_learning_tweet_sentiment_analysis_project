import { 
  Paper, 
  Box, 
  FormControl, 
  FormLabel, 
  Select, 
  MenuItem, 
  InputLabel, 
  Typography, 
  Slider,
  RadioGroup,
  FormControlLabel,
  Radio,
  
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { Settings, ExpandMore } from '@mui/icons-material';
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

export interface LabelingParams {
  // Clustering params
  clusteringAlgorithm: string;  // "kmeans", "hierarchical", "agglomerative", "dbscan"
  nClusters: number;
  linkage: string;
  eps: number;
  minSamples: number;
  randomState: number;
  // Naive params
  useDefaultKeywords: boolean;
  // Classify params (for future)
  kernel: string;
  cValue: number;
  nEstimators: number;
  maxDepth: number;
  kNeighbors: number;
}

interface LabelingConfigProps {
  labelingMethod: string;
  setLabelingMethod: (value: string) => void;
  labelingParams: LabelingParams;
  setLabelingParams: (params: LabelingParams) => void;
}

const LabelingConfig = ({
  labelingMethod,
  setLabelingMethod,
  labelingParams,
  setLabelingParams,
}: LabelingConfigProps) => {
  const primaryColor = '#646cff';

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
        <FormLabel component="legend" sx={{ color: '#fff', fontWeight: 600 }}>
          Labeling
        </FormLabel>
      </Box>

      <FormControl component="fieldset" sx={{ mb: 2 }}>
        <RadioGroup value={labelingMethod} onChange={(e) => setLabelingMethod(e.target.value)}>
          <FormControlLabel
            value="manual"
            control={
              <Radio
                sx={{
                  color: primaryColor,
                  '&.Mui-checked': { color: primaryColor },
                }}
              />
            }
            label="Manual Labeling"
            sx={{ color: '#ccc', mb: 1 }}
          />
          <FormControlLabel
            value="naive"
            control={
              <Radio
                sx={{
                  color: primaryColor,
                  '&.Mui-checked': { color: primaryColor },
                }}
              />
            }
            label="Auto Naive (Keyword-based)"
            sx={{ color: '#ccc', mb: 1 }}
          />
          <FormControlLabel
            value="clustering"
            control={
              <Radio
                sx={{
                  color: primaryColor,
                  '&.Mui-checked': { color: primaryColor },
                }}
              />
            }
            label="Auto Clustering"
            sx={{ color: '#ccc', mb: 1 }}
          />
        
        </RadioGroup>
      </FormControl>

      {/* Manual Labeling Info */}
      {labelingMethod === 'manual' && (
        <Box sx={{ mt: 2, p: 2, backgroundColor: '#1a1a1c', borderRadius: 1 }}>
          <Typography sx={{ color: '#999', fontSize: '0.875rem' }}>
            Manual labeling will open a modal where you can label tweets row by row.
            Select target values: 0 (Negative), 2 (Neutral), or 4 (Positive).
          </Typography>
        </Box>
      )}

      {/* Naive Labeling Options */}
      {labelingMethod === 'naive' && (
        <Box sx={{ mt: 2 }}>
          
          <Typography sx={{ color: '#999', fontSize: '0.75rem', mt: 1, ml: 4 }}>
            Uses keywords from storage: keywords/positive.txt and keywords/negative.txt
          </Typography>
        </Box>
      )}

      {/* Clustering Options */}
      {labelingMethod === 'clustering' && (
        <Box sx={{ mt: 2 }}>
          {/* Algorithm Selection */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="clustering-algo-label" sx={{ color: '#999' }}>
              Clustering Algorithm
            </InputLabel>
            <Select
              labelId="clustering-algo-label"
              value={labelingParams.clusteringAlgorithm || 'kmeans'}
              onChange={(e) => setLabelingParams({ ...labelingParams, clusteringAlgorithm: e.target.value })}
              label="Clustering Algorithm"
              sx={{
                color: '#fff',
                '.MuiOutlinedInput-notchedOutline': { borderColor: '#444' },
                '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
              }}
            >
              <MenuItem value="kmeans">K-Means</MenuItem>
              <MenuItem value="hierarchical">Hierarchical (Jaccard)</MenuItem>
    
            </Select>
          </FormControl>

          {/* Parameters based on algorithm */}
          <Accordion
            sx={{
              backgroundColor: 'transparent',
              boxShadow: 'none',
              border: '1px solid #1a1a1c',
              '&:before': { display: 'none' },
            }}
          >
            <AccordionSummary
              expandIcon={<ExpandMore sx={{ color: primaryColor }} />}
              sx={{ color: '#fff' }}
            >
              <Typography sx={{ fontSize: '0.875rem' }}>Parameters</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* n_clusters - for kmeans, hierarchical, agglomerative */}
                {['kmeans', 'hierarchical', 'agglomerative'].includes(labelingParams.clusteringAlgorithm || 'kmeans') && (
                  <>
                    <Typography sx={{ color: '#ccc', mb: 1 }}>
                      Number of Clusters: {labelingParams.nClusters}
                    </Typography>
                    <Slider
                      value={labelingParams.nClusters}
                      onChange={(_, val) => setLabelingParams({ ...labelingParams, nClusters: val as number })}
                      min={2}
                      max={10}
                      marks={[
                        { value: 2, label: '2' },
                        { value: 5, label: '5' },
                        { value: 10, label: '10' },
                      ]}
                      sx={{ 
                        color: primaryColor,
                        '& .MuiSlider-markLabel': { color: '#666', fontSize: '0.75rem' }
                      }}
                    />
                  </>
                )}

                {/* Linkage - for hierarchical, agglomerative */}
                {['hierarchical', 'agglomerative'].includes(labelingParams.clusteringAlgorithm || '') && (
                  <FormControl fullWidth>
                    <InputLabel id="linkage-label" sx={{ color: '#999' }}>
                      Linkage Method
                    </InputLabel>
                    <Select
                      labelId="linkage-label"
                      value={labelingParams.linkage}
                      onChange={(e) => setLabelingParams({ ...labelingParams, linkage: e.target.value })}
                      label="Linkage Method"
                      sx={{
                        color: '#fff',
                        '.MuiOutlinedInput-notchedOutline': { borderColor: '#1a1a1c' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: primaryColor },
                      }}
                    >
                      <MenuItem value="average">Average</MenuItem>
                      <MenuItem value="complete">Complete</MenuItem>
                      <MenuItem value="ward">Ward</MenuItem>
                    </Select>
                  </FormControl>
                )}

                {/* DBSCAN params */}
                {labelingParams.clusteringAlgorithm === 'dbscan' && (
                  <>
                    <Typography sx={{ color: '#ccc', mb: 1 }}>
                      Epsilon (eps): {labelingParams.eps}
                    </Typography>
                    <Slider
                      value={labelingParams.eps}
                      onChange={(_, val) => setLabelingParams({ ...labelingParams, eps: val as number })}
                      min={0.1}
                      max={2.0}
                      step={0.1}
                      marks={[
                        { value: 0.1, label: '0.1' },
                        { value: 1, label: '1.0' },
                        { value: 2, label: '2.0' },
                      ]}
                      sx={{ 
                        color: primaryColor,
                        '& .MuiSlider-markLabel': { color: '#666', fontSize: '0.75rem' }
                      }}
                    />
                    <Typography sx={{ color: '#ccc', mb: 1, mt: 2 }}>
                      Min Samples: {labelingParams.minSamples}
                    </Typography>
                    <Slider
                      value={labelingParams.minSamples}
                      onChange={(_, val) => setLabelingParams({ ...labelingParams, minSamples: val as number })}
                      min={2}
                      max={20}
                      step={1}
                      marks={[
                        { value: 2, label: '2' },
                        { value: 10, label: '10' },
                        { value: 20, label: '20' },
                      ]}
                      sx={{ 
                        color: primaryColor,
                        '& .MuiSlider-markLabel': { color: '#666', fontSize: '0.75rem' }
                      }}
                    />
                    <Typography sx={{ color: '#777', fontSize: '0.75rem', mt: 1 }}>
                      DBSCAN may create noise points labeled as -1
                    </Typography>
                  </>
                )}

                {/* Algorithm info */}
                <Box sx={{ mt: 1, p: 1, backgroundColor: '#1a1a1c', borderRadius: 1 }}>
                  <Typography sx={{ color: '#777', fontSize: '0.75rem' }}>
                    {labelingParams.clusteringAlgorithm === 'kmeans' && 
                      'K-Means: Fast, works well with spherical clusters. Uses TF-IDF vectors.'}
                    {labelingParams.clusteringAlgorithm === 'hierarchical' && 
                      'Hierarchical: Uses Jaccard distance on word sets. Good for text similarity.'}
                    {labelingParams.clusteringAlgorithm === 'agglomerative' && 
                      'Agglomerative: Bottom-up clustering with linkage. Uses TF-IDF vectors.'}
                    {labelingParams.clusteringAlgorithm === 'dbscan' && 
                      'DBSCAN: Density-based, finds clusters of arbitrary shape. No need to specify n_clusters.'}
                  </Typography>
                </Box>
              </Box>
            </AccordionDetails>
          </Accordion>
        </Box>
      )}

    </Paper>
  );
};

export default LabelingConfig;

