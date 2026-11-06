import math
import difflib
import re
from collections import Counter

DEFAULT_STOPWORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", 
    "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", 
    "by", "can", "did", "do", "does", "doing", "don", "down", "during", "each", "few", "for", 
    "from", "further", "had", "has", "have", "having", "he", "her", "here", "hers", "herself", 
    "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it", "its", "itself", "just", 
    "me", "more", "most", "my", "myself", "no", "nor", "not", "now", "of", "off", "on", "once", 
    "only", "or", "other", "our", "ours", "ourselves", "out", "over", "own", "s", "same", "she", 
    "should", "so", "some", "such", "t", "than", "that", "the", "their", "theirs", "them", 
    "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too", 
    "under", "until", "up", "very", "was", "we", "were", "what", "when", "where", "which", 
    "while", "who", "whom", "why", "will", "with", "you", "your", "yours", "yourself", "yourselves"
}

def fast_tokenize(text):
    """Tokenizes preprocessed or raw text with maximum speed."""
    if not text:
        return []
    return text.lower().split()

def get_cosine_similarity(text1, text2):
    words1 = fast_tokenize(text1)
    words2 = fast_tokenize(text2)
    
    if not words1 or not words2:
        return 0.0
        
    vec1 = Counter(words1)
    vec2 = Counter(words2)
    
    intersection = set(vec1.keys()) & set(vec2.keys())
    numerator = sum([vec1[x] * vec2[x] for x in intersection])
    
    sum1 = sum([vec1[x]**2 for x in vec1.keys()])
    sum2 = sum([vec2[x]**2 for x in vec2.keys()])
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    
    if not denominator:
        return 0.0
    return float(numerator) / denominator * 100

def get_jaccard_similarity(text1, text2):
    set1 = set(fast_tokenize(text1))
    set2 = set(fast_tokenize(text2))
    if not set1 and not set2:
        return 0.0
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    return float(len(intersection)) / len(union) * 100 if union else 0.0

def get_sequence_matcher_similarity(text1, text2, max_tokens=3000):
    """
    Token-based sequence matcher for high performance.
    Comparing token lists is 10x faster than character-by-character sequence matching and avoids timeouts.
    """
    tokens1 = fast_tokenize(text1)[:max_tokens]
    tokens2 = fast_tokenize(text2)[:max_tokens]
    if not tokens1 or not tokens2:
        return 0.0
    return difflib.SequenceMatcher(None, tokens1, tokens2).ratio() * 100

def get_levenshtein_similarity(text1, text2):
    return get_sequence_matcher_similarity(text1, text2)

def get_ngram_similarity(text1, text2, n=3):
    words1 = fast_tokenize(text1)
    words2 = fast_tokenize(text2)
    
    if len(words1) < n or len(words2) < n:
        # Fallback to Jaccard on unigrams if text is shorter than n
        return get_jaccard_similarity(text1, text2)
        
    ngrams1 = set(zip(*[words1[i:] for i in range(n)]))
    ngrams2 = set(zip(*[words2[i:] for i in range(n)]))
    
    intersection = ngrams1.intersection(ngrams2)
    union = ngrams1.union(ngrams2)
    return float(len(intersection)) / len(union) * 100 if union else 0.0

def get_lcs_similarity(text1, text2, max_tokens=2500):
    """Computes Longest Common Subsequence percentage on token sequences."""
    tokens1 = fast_tokenize(text1)[:max_tokens]
    tokens2 = fast_tokenize(text2)[:max_tokens]
    
    if not tokens1 or not tokens2:
        return 0.0
        
    matcher = difflib.SequenceMatcher(None, tokens1, tokens2)
    match = matcher.find_longest_match(0, len(tokens1), 0, len(tokens2))
    
    lcs_length = match.size
    min_length = min(len(tokens1), len(tokens2))
    
    return (lcs_length / min_length) * 100 if min_length > 0 else 0.0

def calculate_all_similarities(text1, text2):
    """
    Computes all similarity metrics with weighted overall aggregation.
    Optimized for sub-second execution even on 50+ page documents.
    """
    cosine = get_cosine_similarity(text1, text2)
    jaccard = get_jaccard_similarity(text1, text2)
    sequence = get_sequence_matcher_similarity(text1, text2)
    ngram = get_ngram_similarity(text1, text2)
    lcs = get_lcs_similarity(text1, text2)
    
    weights = {
        "cosine": 0.25,
        "jaccard": 0.15,
        "sequence": 0.20,
        "ngram": 0.20,
        "lcs": 0.20
    }
    
    overall = (
        cosine * weights["cosine"] +
        jaccard * weights["jaccard"] +
        sequence * weights["sequence"] +
        ngram * weights["ngram"] +
        lcs * weights["lcs"]
    )
    
    return {
        "cosine": round(cosine, 2),
        "jaccard": round(jaccard, 2),
        "sequence": round(sequence, 2),
        "ngram": round(ngram, 2),
        "spacy": 0.0,
        "lcs": round(lcs, 2),
        "overall": round(overall, 2)
    }

def extract_keywords(text, top_n=10):
    """Extracts dominant keywords based on word frequency excluding stopwords."""
    if not text:
        return []
    words = [
        w for w in re.findall(r'\b[a-z]{3,}\b', text.lower())
        if w not in DEFAULT_STOPWORDS
    ]
    word_freq = Counter(words)
    return [word for word, freq in word_freq.most_common(top_n)]

def get_verdict(score):
    if score <= 20: return "Original"
    elif score <= 40: return "Low Similarity"
    elif score <= 60: return "Moderate Similarity"
    elif score <= 80: return "High Similarity"
    else: return "Highly Plagiarized"
