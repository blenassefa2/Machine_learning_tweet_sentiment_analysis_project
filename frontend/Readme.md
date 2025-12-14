# ML Pipeline Studio - Frontend Application

A modern, responsive single-page web application for tweet sentiment analysis. Built with React, TypeScript, and Material-UI, providing an intuitive interface for the complete ML pipeline: data upload, cleaning, labeling, training, and evaluation.

## Technology Stack

- **React 19.1.1** - UI library with hooks
- **TypeScript 5.9.3** - Type-safe JavaScript
- **Material-UI (MUI) 7.x** - Component library (Grid v2 syntax)
- **Vite 7.x** - Build tool and development server
- **Emotion** - CSS-in-JS styling with keyframe animations
- **Axios** - HTTP client for API communication
- **Vercel** - Frontend deployment platform

## Features

### Core Functionality
- **File Upload**: Drag-and-drop CSV upload with 2MB size limit
- **Data Cleaning**: Remove duplicates, handle missing values, text preprocessing
- **Labeling**: Manual annotation, naive keyword-based, clustering-based
- **Model Training**: KNN, Naive Bayes, Naive Automatic algorithms
- **Evaluation**: Visual metrics display with confusion matrix
- **Progress Tracking**: Real-time job progress with polling

### UI/UX Features
- **Session-based**: Anonymous sessions persisted via localStorage
- **Dark theme** with blue accent colors (`#646cff`)
- **Smooth animations**: Fade-in, slide-up, hover effects
- **Responsive design**: Mobile and desktop layouts
- **Background animations**: Bouncing balls, flowing lines, floating particles

---

## Technical Explanations

### Pipeline Configuration System

The application uses a **three-panel configuration system** that maps user choices to backend API parameters:

#### 1. Data Cleaning Configuration

```typescript
interface CleaningOptions {
  remove_duplicates?: boolean;
  missing_value_options?: MissingValueOption[];
  keep_columns?: { index: number; name: string }[];
  text_cleaning?: TextCleaningOptions;
  column_validations?: ColumnValidationOptions[];
}
```

**Key feature - Column Mapping:**
Users specify which columns to keep using format: `"0:target, 5:tweet"`
- Parsed into structured format: `[{ index: 0, name: "target" }, { index: 5, name: "tweet" }]`
- Allowed names: `tweet`, `id`, `date`, `target`, `username`, `topic`
- Enables handling of non-standard CSV structures

**Text cleaning options:**
- Remove URLs, retweets, hashtags, mentions
- Remove HTML tags, extra spaces
- Remove contradictory emojis
- Language filtering (English/French only)

#### 2. Labeling Configuration

```typescript
interface LabelingParams {
  clusteringAlgorithm: string;  // "kmeans" | "hierarchical"
  nClusters: number;
  linkage: string;              // "average" | "complete" | "ward"
  eps: number;                  // DBSCAN only
  minSamples: number;           // DBSCAN only
  useDefaultKeywords: boolean;
}
```

**Three labeling methods:**

| Method | Description | UI Workflow |
|--------|-------------|-------------|
| **Manual** | Opens modal for row-by-row annotation | User labels each tweet (0/2/4), can navigate back |
| **Naive** | Keyword-based automatic labeling | Uses backend keyword files |
| **Clustering** | Groups tweets by text similarity | Configurable algorithm and parameters |

**Manual Labeling Modal:**
- Fetches entire dataset to frontend
- Displays one row at a time with navigation
- Quick label buttons: Negative (0), Neutral (2), Positive (4)
- Real-time progress bar and label distribution stats
- "Stop & Save" for partial labeling

#### 3. Training Configuration

```typescript
interface TrainingConfig {
  learningModel: string;        // "knn" | "naive_bayes" | "naive_automatic"
  testSplit: number;            // 10-40%
  kValue: number;               // KNN: number of neighbors
  ngram: string;                // Naive Bayes: "unigram" | "bigram" | "trigram"
  featureRep: string;           // Naive Bayes: "count" | "binary"
}
```

**Algorithm-specific parameters dynamically shown:**
- **KNN**: K slider (1-15) with Jaccard distance explanation
- **Naive Bayes**: N-gram dropdown + Feature representation dropdown
- **Naive Automatic**: Info box explaining keyword-based classification

### State Management Flow

```
ConfigurationReview.tsx (parent)
├── ProcessConfigurations.tsx
│   ├── DataCleaningConfig.tsx   → cleaningConfig state
│   ├── LabelingConfig.tsx       → labelingParams state
│   └── TrainingConfig.tsx       → trainingConfig state
└── DataReview.tsx
    ├── handleClean()  → builds CleaningOptions from cleaningConfig
    ├── handleLabel()  → builds request from labelingParams
    └── handleTrain()  → builds hyperparameters from trainingConfig
```

### API Communication Pattern

```typescript
// Example: Training request
const hyperparameters: Record<string, any> = {};

if (algorithm === 'knn') {
  hyperparameters.k = trainingConfig.kValue;
} else if (algorithm === 'naive_bayes') {
  hyperparameters.ngram = trainingConfig.ngram;
  hyperparameters.feature_rep = trainingConfig.featureRep;
}

await trainModel({
  dataset_id, session_id, algorithm, hyperparameters,
  test_size: trainingConfig.testSplit / 100
});
```

### Progress Modal System

Unified modal for all job types (cleaning, labeling, training):
- **Polling mechanism**: Checks job status every 2 seconds
- **Status states**: `pending` → `queued` → `running` → `completed` | `failed`
- **Visual feedback**: Progress bar, status text, preview on completion
- **Labeling summary**: Graphical distribution bar with sentiment counts

---

## Technical Difficulties Faced

### 1. Clustering Results Confusion

**Problem:** When using Average and Complete linkage for clustering, almost all tweets ended up in a single cluster, making me think the algorithm was broken.

**Investigation:** Tested with multiple datasets - same behavior. Researched hierarchical clustering deeply.

**Understanding gained:** Clustering measures **word similarity (Jaccard distance)**, not sentiment. Tweets with similar vocabulary cluster together regardless of meaning. Average/Complete linkage are sensitive to small distance differences.

**Mitigation:** 
- Added Ward linkage option (produces more balanced clusters)
- Added info tooltips explaining each algorithm's behavior
- Accepted that clustering is not ideal for sentiment analysis

### 2. File Encoding Issues

**Problem:** Non-UTF-8 encoded CSV files caused backend decode errors, breaking the entire upload flow.

**Initial attempts:** Tried implementing client-side encoding detection using FileReader, but JavaScript's binary handling made this unreliable.

**Mitigation:** 
- Added frontend validation message: "Please ensure UTF-8 encoding"
- Backend implements multi-encoding fallback
- Clear error messages when encoding fails

### 3. Dynamic Dataset Column Detection

**Problem:** Users upload datasets with varying structures - different column orders, names, and even no headers. Target column might be called "polarity", "sentiment", "label", or just be column index 0.

**Mitigation:** 
Created **Keep Columns configuration**:
```
User input: "0:target, 5:tweet"
↓
Parsed to: [{ index: 0, name: "target" }, { index: 5, name: "tweet" }]
```
- Dropdown for allowed column types
- Validation against allowed names
- Backend uses this mapping to standardize processing

### 4. Large File Upload Limits

**Problem:** Files over 250MB crashed the free-tier Render backend due to memory limits.

**Mitigation:**
- Frontend enforces **2MB maximum** file size
- Clear error message: "File too large. Maximum size is 2MB."
- Disabled upload button during processing to prevent duplicate uploads

### 5. MUI Grid v2 Syntax Migration

**Problem:** TypeScript errors with MUI Grid component:
```
Property 'item' does not exist on type...
```

**Cause:** MUI v6+ uses new Grid syntax without `item` prop.

**Mitigation:** Changed from:
```tsx
<Grid item xs={6} sm={3}>  // Old v5 syntax
```
to:
```tsx
<Grid size={{ xs: 6, sm: 3 }}>  // New v6 syntax
```

### 6. File Input Reset Issue

**Problem:** After uploading a file, selecting the same file again didn't trigger the upload.

**Cause:** HTML file input doesn't fire `onChange` if the same file is selected.

**Mitigation:** 
```tsx
const fileInputRef = useRef<HTMLInputElement>(null);

const resetFileInput = () => {
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
};
// Call after upload completes or fails
```

### 7. Session Persistence

**Problem:** Users lost their datasets when refreshing the page.

**Mitigation:** Implemented `SessionContext` with localStorage:
```tsx
const [sessionId] = useState(() => {
  const stored = localStorage.getItem('ml_session_id');
  if (stored) return stored;
  const newId = crypto.randomUUID();
  localStorage.setItem('ml_session_id', newId);
  return newId;
});
```

### 8. API URL Configuration

**Problem:** `getLabelingResult()` was returning HTML instead of JSON - hitting the frontend dev server instead of backend.

**Cause:** Missing `API_BASE` prefix in axios call.

**Mitigation:** Ensured all API calls use the configured base URL:
```typescript
const API_BASE = "https://machine-learning-tweet-sentiment.onrender.com/datasets";
axios.get(`${API_BASE}/${datasetId}/labeling`, { params: { session_id } });
```

---

## Results and Observations

### Algorithm Performance

| Algorithm | Best Settings | Why |
|-----------|---------------|-----|
| **Naive Bayes** | Bigram + Binary | Captures word pairs ("not good"), presence-only reduces noise from word frequency |
| **KNN** | K = 7-11 | More neighbors = more stable voting; too high K loses local patterns |
| **Naive Automatic** | Domain-specific keywords | Directly depends on keyword list quality |

### Key Observations

1. **Naive Bayes with bigram + binary features slightly outperforms other configurations** - Word pairs capture negation and context better than single words.

2. **KNN performance increases with K** - Higher K values provide more robust majority voting, reducing sensitivity to outlier training examples.

3. **Naive Automatic works best with comprehensive, domain-specific keyword lists** - Generic sentiment words miss domain-specific expressions.

### Clustering Insights

| Linkage | Behavior | Suitability for Sentiment |
|---------|----------|---------------------------|
| **Average** | Creates one dominant cluster | Poor - ignores subtle differences |
| **Complete** | Creates one dominant cluster | Poor - outlier sensitive |
| **Ward** | More balanced distribution | Better visualization, but still measures word overlap not sentiment |

**Critical insight:** Clustering fundamentally cannot solve sentiment analysis because:
- **Jaccard distance measures lexical overlap**, not semantic meaning
- "I love this movie" and "I hate this movie" have high similarity
- Clustering groups by vocabulary, not by sentiment polarity

---

## Conclusion

This frontend demonstrates a complete ML pipeline interface with:

1. **Flexible configuration** - Users can customize every step from cleaning to training
2. **Visual feedback** - Progress modals, graphical metrics, and confusion matrix visualization
3. **Robust error handling** - Clear messages for encoding, file size, and API errors
4. **Type safety** - Full TypeScript coverage for reliable development

**Key learnings:**
- Data preprocessing (encoding, column mapping) is as important as the ML algorithms
- Clustering algorithms are not suitable for sentiment analysis due to measuring syntactic rather than semantic similarity
- Supervised methods (KNN, Naive Bayes) with proper parameter tuning provide the best results for text classification
