import pandas as pd
from app.services.classify_service import _classify_naive_by_keywords, _run_clustering
from types import SimpleNamespace
from sklearn.feature_extraction.text import TfidfVectorizer

def test_naive_keyword_classify():
    df = pd.DataFrame({"text": ["I love this", "This is bad", "neutral comment"]})
    keywords = {"pos":["love"], "neg":["bad"]}
    labels = _classify_naive_by_keywords(df, keywords)
    assert labels.tolist() == ["pos","neg",-1]

def test_kmeans_clustering_small():
    df = pd.DataFrame({"text": ["apple orange", "banana fruit", "table chair", "seat desk"]})
    # vectorize
    vec = TfidfVectorizer()
    X = vec.fit_transform(df['text'])
    hp = SimpleNamespace(n_clusters=2, random_state=42)
    preds = _run_clustering(X, "kmeans", hp)
    assert len(preds) == 4