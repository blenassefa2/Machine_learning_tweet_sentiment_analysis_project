# ML Pipeline Studio - Backend API

A FastAPI backend for tweet sentiment analysis, implementing custom machine learning algorithms for classification, clustering-based labeling, and model evaluation.

## Technology Stack

- **FastAPI** - Modern, high-performance Python web framework
- **Python 3.13** - Core programming language
- **Supabase** - PostgreSQL database and file storage (datasets, models, keywords)
- **scikit-learn** - For train/test splitting, metrics computation, and clustering algorithms
- **pandas / NumPy** - Data manipulation and numerical operations
- **scipy** - Hierarchical clustering with custom distance matrices
- **Render** - Cloud deployment platform (free tier)

## Features

- **Dataset Management**: Upload, preview, and manage CSV datasets
- **Data Cleaning**: Remove duplicates, handle missing values, text cleaning (URLs, mentions, hashtags, etc.)
- **Labeling Methods**:
  - Manual labeling (row-by-row annotation)
  - Naive automatic (keyword-based sentiment classification)
  - Clustering-based (K-Means, Hierarchical, Agglomerative, DBSCAN)
- **Model Training**: KNN, Naive Bayes, Naive Automatic classifiers
- **Evaluation**: Accuracy, Precision, Recall, F1-Score, Confusion Matrix
- **Asynchronous Job Processing**: Background tasks for long-running operations

---

## Technical Explanations

### Custom Algorithm Implementations

The backend uses **custom implementations** instead of sklearn for the main classifiers to demonstrate understanding of the underlying algorithms:

#### 1. Custom KNN (K-Nearest Neighbors)

```python
class CustomKNN:
    """KNN classifier using Jaccard distance for text similarity."""
```

**How it works:**
- Uses **Jaccard distance** to measure text similarity between tweets
- Jaccard distance = 1 - (|A ∩ B| / |A ∪ B|) where A and B are word sets
- Stores all training data as a knowledge base
- For prediction, finds K nearest neighbors using a **max-heap** for efficiency
- Returns the majority class among K neighbors

**Key parameter:** `k` (number of neighbors) - higher k generally improves performance but increases computation time.

#### 2. Custom Naive Bayes

```python
class CustomNaiveBayes:
    """Naive Bayes with Laplace smoothing, supporting n-grams."""
```

**How it works:**
- Computes **P(word|class)** with Laplace smoothing to handle unseen words
- Supports **n-gram tokenization**: unigram, bigram, trigram
- Feature representation: **count** (word frequency) or **binary** (presence only)
- Uses **log probabilities** to prevent underflow with many features
- Classification: argmax of P(class) × ∏P(word|class)

**Key parameters:**
- `ngram`: "unigram", "bigram", or "trigram"
- `feature_rep`: "count" or "binary"

#### 3. Naive Automatic (Keyword-Based)

```python
class NaiveAutomaticClassifier:
    """Keyword-based classifier using positive/negative word lists."""
```

**How it works:**
- Loads positive and negative keyword lists from Supabase storage
- For each tweet, counts occurrences of positive vs negative words
- Classification rule:
  - `pos_count > neg_count` → **4 (Positive)**
  - `neg_count > pos_count` → **0 (Negative)**
  - `equal` → **2 (Neutral)**

### Clustering Algorithms (from sklearn/scipy)

#### K-Means Clustering
- Imported from `sklearn.cluster.KMeans`
- Uses **TF-IDF vectorization** for text representation
- Fast, works well with spherical clusters

#### Hierarchical Clustering (Custom with Jaccard Distance)

```python
def _run_hierarchical_clustering(tweets: List[str], k: int, linkage_method: str):
```

This is the most interesting clustering implementation:

1. **Computes Jaccard distance matrix** between all tweet pairs
2. Converts to **condensed distance matrix** (scipy format)
3. Applies **scipy.cluster.hierarchy.linkage** with specified method
4. Uses **fcluster** to cut the dendrogram into k clusters

**Linkage methods:**
- **Average**: Uses mean distance between cluster pairs
- **Complete**: Uses maximum distance (farthest neighbor)
- **Ward**: Minimizes within-cluster variance (often produces more balanced clusters)

#### Agglomerative Clustering
- Imported from `sklearn.cluster.AgglomerativeClustering`
- Bottom-up hierarchical clustering using TF-IDF vectors

#### DBSCAN
- Imported from `sklearn.cluster.DBSCAN`
- Density-based clustering, doesn't require specifying number of clusters
- Parameters: `eps` (neighborhood radius), `min_samples` (minimum points for core sample)

---

## Technical Difficulties Faced

### 1. Clustering Results Confusion

**Problem:** Average and Complete linkage methods were clustering almost all tweets into a single cluster.

**Investigation:** Tested with multiple datasets - results were similar across datasets.

**Understanding gained:** Clustering algorithms measure **word distance (Jaccard)**, not semantic sentiment. Tweets with similar vocabulary end up together regardless of sentiment.

**Mitigation:** Educated myself on how hierarchical clustering works - it groups by text similarity, not meaning. This is inherently different from sentiment classification.

### 2. File Encoding Issues

**Problem:** CSV files with non-UTF-8 encoding (e.g., Latin-1, CP1252) caused decode errors:
```
'utf-8' codec can't decode byte 0xe9 in position 1723
```

**Initial attempts:** Tried automatic encoding detection on file objects, but binary streams always resulted in corrupted data.

**Mitigation:** 
- Implemented robust encoding fallback: try UTF-8 → Latin-1 → ISO-8859-1 → CP1252 → UTF-8 with error replacement
- Added user-facing restriction to use UTF-8 encoded files
- For keyword files, implemented comma-separated parsing with encoding fallback

### 3. Dynamic Column Detection

**Problem:** User datasets have different column structures - some have headers, some don't. Target column could be in any position with various names (polarity, sentiment, target, label).

**Mitigation:** 
- Created **Data Cleaning Configuration** allowing users to specify column mappings: `"0:target, 5:tweet"`
- Backend tries multiple column name patterns: `["target", "polarity", "sentiment", "label"]`
- For labeled files (no headers), assumes target is column 0

### 4. Large File Upload Limits

**Problem:** Files over 250MB crashed the Render free tier deployment due to memory constraints.

**Mitigation:** 
- Implemented frontend file size restriction of **2MB maximum**
- Added clear error messaging for oversized files
- Backend validates file size before processing

### 5. Supabase Storage Overwrite Issue

**Problem:** Labeled files weren't being updated because Supabase storage `upload()` fails silently if file exists.

**Mitigation:** Delete existing file before upload:
```python
try:
    supabase.storage.from_(bucket).remove([path])
except Exception:
    pass  # File might not exist
supabase.storage.from_(bucket).upload(path, data)
```

### 6. Foreign Key Constraints

**Problem:** Creating `training_jobs` before `trained_models` violated foreign key constraint.

**Mitigation:** Create placeholder entry in `trained_models` first, then create the job, then update the model entry with actual results.

### 7. Keyword File Parsing

**Problem:** Keyword files were comma-separated but code was splitting by newlines.

**Mitigation:** Changed parsing from `splitlines()` to `split(',')` with proper stripping and lowercasing.

---

## Results and Observations

### Algorithm Performance Comparison

| Algorithm | Best Configuration | Observation |
|-----------|-------------------|-------------|
| **Naive Bayes** | Bigram + Binary | Slightly better than unigram; presence-only features reduce noise |
| **KNN** | Higher K (7-11) | Performance improves with more neighbors; diminishing returns after ~11 |
| **Naive Automatic** | Same keywords for both | Works best when positive/negative word lists are comprehensive and domain-specific |

### Key Findings

1. **Naive Bayes performs slightly better with bigram + binary representation** - Captures word pairs (e.g., "not good") and presence-only reduces impact of word frequency variations.

2. **KNN improves with higher K values** - More neighbors provide more stable voting, reducing sensitivity to outliers.

3. **Naive Automatic depends heavily on keyword quality** - Performance directly correlates with how well the word lists cover the domain vocabulary.

### Clustering Observations

| Linkage Method | Cluster Distribution | Best Use Case |
|----------------|---------------------|---------------|
| **Average** | Highly imbalanced (most in 1 cluster) | Small distance variations ignored |
| **Complete** | Highly imbalanced | Sensitive to outliers, creates loose clusters |
| **Ward** | More balanced distribution | Minimizes variance, better for visualization |

**Critical insight:** Clustering is fundamentally unsuitable for tweet sentiment analysis because:
- Jaccard distance measures **lexical similarity**, not semantic meaning
- Tweets saying "I love this" and "I hate this" have similar vocabulary but opposite sentiments
- Clustering groups tweets by word overlap, not by sentiment polarity

---

## Conclusion

This backend demonstrates the implementation of custom machine learning algorithms while highlighting the importance of choosing appropriate methods for specific tasks:

1. **Supervised learning (KNN, Naive Bayes)** is effective for sentiment classification when labeled training data is available.

2. **Keyword-based (Naive Automatic)** provides a simple baseline that works well with domain-specific word lists.

3. **Clustering** is not ideal for sentiment analysis due to the disconnect between lexical similarity and semantic sentiment.

4. **Data quality matters** - encoding issues, column standardization, and file size limits all significantly impact the pipeline's reliability.

The project successfully handles the full ML pipeline from data ingestion to model evaluation, with robust error handling for real-world data challenges.
