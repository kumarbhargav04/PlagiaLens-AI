import math
import difflib
import nltk
from nltk.tokenize import word_tokenize, sent_tokenize
from collections import Counter
import re

# Initialize spaCy model if available
try:
    import spacy
    try:
        nlp = spacy.load("en_core_web_sm")
    except OSError:
        import spacy.cli
        spacy.cli.download("en_core_web_sm")
        nlp = spacy.load("en_core_web_sm")
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False
    nlp = None

def get_cosine_similarity(text1, text2):
    # Custom Cosine Similarity implementation without scikit-learn
    words1 = word_tokenize(text1.lower())
    words2 = word_tokenize(text2.lower())
    
    vec1 = Counter(words1)
    vec2 = Counter(words2)
    
    intersection = set(vec1.keys()) & set(vec2.keys())
    numerator = sum([vec1[x] * vec2[x] for x in intersection])
    
    sum1 = sum([vec1[x]**2 for x in vec1.keys()])
    sum2 = sum([vec2[x]**2 for x in vec2.keys()])
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    
    if not denominator:
        return 0.0
    else:
        return float(numerator) / denominator * 100

def get_jaccard_similarity(text1, text2):
    set1 = set(word_tokenize(text1.lower()))
    set2 = set(word_tokenize(text2.lower()))
    if not set1 and not set2:
        return 0.0
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    return float(len(intersection)) / len(union) * 100

def get_sequence_matcher_similarity(text1, text2):
    return difflib.SequenceMatcher(None, text1, text2).ratio() * 100

def get_levenshtein_similarity(text1, text2):
    # Simplified Levenshtein similarity using difflib for efficiency on large texts
    # For actual Levenshtein, a custom DP approach or python-Levenshtein package is needed,
    # but difflib is close enough for general string matching and standard library.
    return get_sequence_matcher_similarity(text1, text2)

def get_ngram_similarity(text1, text2, n=3):
    def get_ngrams(text, n):
        words = word_tokenize(text.lower())
        return set(zip(*[words[i:] for i in range(n)]))
    
    ngrams1 = get_ngrams(text1, n)
    ngrams2 = get_ngrams(text2, n)
    
    if not ngrams1 and not ngrams2: return 0.0
    
    intersection = ngrams1.intersection(ngrams2)
    union = ngrams1.union(ngrams2)
    return float(len(intersection)) / len(union) * 100 if union else 0.0

def get_spacy_similarity(text1, text2):
    if not SPACY_AVAILABLE or not nlp:
        return 0.0
    doc1 = nlp(text1)
    doc2 = nlp(text2)
    if doc1.vector_norm == 0 or doc2.vector_norm == 0:
        return 0.0
    return doc1.similarity(doc2) * 100

def get_lcs_similarity(text1, text2):
    # Longest Common Subsequence
    words1 = word_tokenize(text1.lower())
    words2 = word_tokenize(text2.lower())
    m, n = len(words1), len(words2)
    if m == 0 or n == 0: return 0.0
    
    L = [[0]*(n+1) for _ in range(m+1)]
    for i in range(m+1):
        for j in range(n+1):
            if i == 0 or j == 0:
                L[i][j] = 0
            elif words1[i-1] == words2[j-1]:
                L[i][j] = L[i-1][j-1] + 1
            else:
                L[i][j] = max(L[i-1][j], L[i][j-1])
                
    lcs_len = L[m][n]
    return (lcs_len / max(m, n)) * 100

def calculate_all_similarities(text1, text2):
    if not text1.strip() or not text2.strip():
        return {
            "cosine": 0, "jaccard": 0, "sequence": 0, "ngram": 0, 
            "spacy": 0, "lcs": 0, "overall": 0
        }
        
    cosine = get_cosine_similarity(text1, text2)
    jaccard = get_jaccard_similarity(text1, text2)
    sequence = get_sequence_matcher_similarity(text1, text2)
    ngram = get_ngram_similarity(text1, text2)
    spacy_sim = get_spacy_similarity(text1[:100000], text2[:100000]) # Limit spacy for performance
    lcs = get_lcs_similarity(text1[:10000], text2[:10000]) # Limit for DP array size
    
    # Weighted average for overall score
    weights = {
        "cosine": 0.25,
        "jaccard": 0.15,
        "sequence": 0.20,
        "ngram": 0.15,
        "spacy": 0.15,
        "lcs": 0.10
    }
    
    if SPACY_AVAILABLE:
        overall = (
            cosine * weights["cosine"] +
            jaccard * weights["jaccard"] +
            sequence * weights["sequence"] +
            ngram * weights["ngram"] +
            spacy_sim * weights["spacy"] +
            lcs * weights["lcs"]
        )
    else:
        # Re-weight if spacy is not available
        adjusted_weights = {
            "cosine": 0.30,
            "jaccard": 0.20,
            "sequence": 0.25,
            "ngram": 0.15,
            "lcs": 0.10
        }
        overall = (
            cosine * adjusted_weights["cosine"] +
            jaccard * adjusted_weights["jaccard"] +
            sequence * adjusted_weights["sequence"] +
            ngram * adjusted_weights["ngram"] +
            lcs * adjusted_weights["lcs"]
        )
    
    return {
        "cosine": round(cosine, 2),
        "jaccard": round(jaccard, 2),
        "sequence": round(sequence, 2),
        "ngram": round(ngram, 2),
        "spacy": round(spacy_sim, 2),
        "lcs": round(lcs, 2),
        "overall": round(overall, 2)
    }

def extract_keywords(text, top_n=10):
    if SPACY_AVAILABLE and nlp:
        doc = nlp(text)
        words = [token.text.lower() for token in doc if token.is_alpha and not token.is_stop]
    else:
        # Fallback keyword extraction using NLTK
        from nltk.corpus import stopwords
        stop_words = set(stopwords.words('english'))
        words = [word.lower() for word in word_tokenize(text) if word.isalpha() and word.lower() not in stop_words]
        
    word_freq = Counter(words)
    return [word for word, freq in word_freq.most_common(top_n)]

def get_verdict(score):
    if score <= 20: return "Original"
    elif score <= 40: return "Low Similarity"
    elif score <= 60: return "Moderate Similarity"
    elif score <= 80: return "High Similarity"
    else: return "Highly Plagiarized"
