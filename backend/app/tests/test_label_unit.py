import pandas as pd
import numpy as np
from app.services.label_service import (
    _label_naive_by_keywords,
    _run_clustering,
    _run_hierarchical_clustering,
    _map_clusters_to_labels,
    jaccard_distance,
    create_distance_matrix,
    align_clusters_to_labels,
)
from types import SimpleNamespace
from sklearn.feature_extraction.text import TfidfVectorizer

def test_jaccard_distance():
    """Test Jaccard distance calculation."""
    # Identical tweets
    assert jaccard_distance("hello world", "hello world") == 0.0
    
    # Completely different
    dist = jaccard_distance("apple orange", "banana cherry")
    assert dist > 0.5  # Should have high distance
    
    # Some overlap
    dist = jaccard_distance("I love this", "I hate this")
    assert 0 < dist < 1.0
    
    # Empty strings
    assert jaccard_distance("", "") == 0.0

def test_create_distance_matrix():
    """Test distance matrix creation."""
    tweets = ["hello world", "hello there", "goodbye world"]
    matrix = create_distance_matrix(tweets, jaccard_distance)
    
    assert len(matrix) == 3
    assert len(matrix[0]) == 3
    # Diagonal should be 0
    assert matrix[0][0] == 0.0
    assert matrix[1][1] == 0.0
    assert matrix[2][2] == 0.0
    # Should be symmetric
    assert matrix[0][1] == matrix[1][0]

def test_naive_keyword_labeling():
    """Test naive keyword-based labeling."""
    df = pd.DataFrame({
        0: [0, 0, 0],  # Target column
        1: ["id1", "id2", "id3"],
        2: ["2023-01-01", "2023-01-02", "2023-01-03"],
        3: ["topic1", "topic2", "topic3"],
        4: ["user1", "user2", "user3"],
        5: ["I love this", "This is bad", "neutral comment"],  # Tweet column
    })
    
    keywords = {"pos": ["love"], "neg": ["bad"]}
    labels = _label_naive_by_keywords(df, keywords, text_col_idx=5)
    
    assert len(labels) == 3
    assert labels.iloc[0] == 4  # "love" -> positive
    assert labels.iloc[1] == 0  # "bad" -> negative
    assert labels.iloc[2] == 2  # No keywords -> neutral

def test_naive_keyword_labeling_with_positive_negative():
    """Test naive labeling with positive/negative keyword names."""
    df = pd.DataFrame({
        5: ["I love this product", "I hate this", "neutral text"],
    })
    
    keywords = {"positive": ["love"], "negative": ["hate"]}
    labels = _label_naive_by_keywords(df, keywords, text_col_idx=0)
    
    assert labels.iloc[0] == 4  # positive
    assert labels.iloc[1] == 0  # negative
    assert labels.iloc[2] == 2  # neutral

def test_kmeans_clustering():
    """Test KMeans clustering."""
    df = pd.DataFrame({
        5: ["apple orange", "banana fruit", "table chair", "seat desk"],
    })
    X = TfidfVectorizer().fit_transform(df.iloc[:, 0])
    hp = SimpleNamespace(n_clusters=2, random_state=42)
    preds = _run_clustering(X, "kmeans", hp)
    
    assert len(preds) == 4
    assert len(np.unique(preds)) <= 2  # Should have at most 2 clusters

def test_hierarchical_clustering():
    """Test hierarchical clustering with Jaccard distance."""
    tweets = ["I love this", "I hate this", "This is good", "This is bad"]
    k = 2
    clusters = _run_hierarchical_clustering(tweets, k, "average")
    
    assert len(clusters) == 4
    assert len(np.unique(clusters)) <= k

def test_map_clusters_to_labels():
    """Test mapping cluster IDs to polarity labels."""
    cluster_labels = np.array([0, 0, 1, 1, 2, 2])
    labels = _map_clusters_to_labels(cluster_labels, n_clusters=3)
    
    assert len(labels) == 6
    # Should map to 0, 2, or 4
    assert all(label in [0, 2, 4] for label in labels)
    
    # Test with noise label
    cluster_labels_with_noise = np.array([0, 1, -1, 2])
    labels = _map_clusters_to_labels(cluster_labels_with_noise, n_clusters=3)
    assert len(labels) == 4
    assert all(label in [0, 2, 4] for label in labels)

def test_align_clusters_to_labels():
    """Test aligning cluster labels to true labels."""
    true_labels = np.array([0, 0, 4, 4, 2, 2])
    cluster_labels = np.array([1, 1, 2, 2, 0, 0])
    
    aligned = align_clusters_to_labels(true_labels, cluster_labels)
    
    assert len(aligned) == 6
    # Should have same unique values as true_labels
    assert set(np.unique(aligned)) == set(np.unique(true_labels))

def test_dbscan_clustering():
    """Test DBSCAN clustering."""
    df = pd.DataFrame({
        5: ["apple orange", "banana fruit", "table chair", "seat desk", "computer mouse"],
    })
    X = TfidfVectorizer().fit_transform(df.iloc[:, 0])
    hp = SimpleNamespace(eps=0.5, min_samples=2, random_state=42)
    preds = _run_clustering(X, "dbscan", hp)
    
    assert len(preds) == 5
    # DBSCAN can have noise (-1)
    assert all(pred >= -1 for pred in preds)

def test_agglomerative_clustering():
    """Test Agglomerative clustering."""
    df = pd.DataFrame({
        5: ["apple orange", "banana fruit", "table chair", "seat desk"],
    })
    X = TfidfVectorizer().fit_transform(df.iloc[:, 0])
    hp = SimpleNamespace(n_clusters=2, linkage="ward", random_state=42)
    preds = _run_clustering(X, "agglomerative", hp)
    
    assert len(preds) == 4
    assert len(np.unique(preds)) <= 2

