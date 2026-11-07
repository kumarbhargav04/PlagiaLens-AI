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
    """Fast tokenization: extracts words and numbers, lowercase."""
    if not text:
        return []
    return re.findall(r'\b[a-z0-9]+\b', text.lower())

def get_cosine_similarity(text1, text2):
    """
    Computes Cosine Similarity and Word Overlap Coefficient.
    In plagiarism detection, if text1 is embedded inside text2 (or vice versa),
    overlap coefficient ensures the copied content is accurately detected rather
    than suppressed by document length discrepancy.
    """
    words1 = fast_tokenize(text1)
    words2 = fast_tokenize(text2)
    
    if not words1 or not words2:
        return 0.0
        
    vec1 = Counter(words1)
    vec2 = Counter(words2)
    
    intersection = set(vec1.keys()) & set(vec2.keys())
    if not intersection:
        return 0.0
        
    # Standard symmetric cosine
    numerator = sum([vec1[x] * vec2[x] for x in intersection])
    sum1 = sum([vec1[x]**2 for x in vec1.keys()])
    sum2 = sum([vec2[x]**2 for x in vec2.keys()])
    denominator = math.sqrt(sum1) * math.sqrt(sum2)
    sym_cosine = (float(numerator) / denominator * 100) if denominator else 0.0
    
    # Asymmetric Overlap Coefficient: shared word count / min(total words)
    shared_count = sum(min(vec1[x], vec2[x]) for x in intersection)
    min_total = min(len(words1), len(words2))
    overlap_score = (shared_count / min_total * 100) if min_total > 0 else 0.0
    
    return round(max(sym_cosine, overlap_score), 2)

def get_jaccard_similarity(text1, text2):
    """
    Computes Jaccard Similarity and Containment to detect overlapping vocabulary.
    Standard Jaccard (inter / union) can be heavily diluted if one document is longer.
    Combining with Containment (inter / min_unique) accurately detects copied source text.
    """
    set1 = set(fast_tokenize(text1))
    set2 = set(fast_tokenize(text2))
    if not set1 or not set2:
        return 0.0
        
    inter = len(set1 & set2)
    if inter == 0:
        return 0.0
        
    union = len(set1 | set2)
    min_len = min(len(set1), len(set2))
    
    jaccard_raw = (inter / union) * 100 if union > 0 else 0.0
    containment = (inter / min_len) * 100 if min_len > 0 else 0.0
    
    # If one document's vocabulary is completely contained in the other, score reflects high containment
    calibrated = max(jaccard_raw, containment * 0.85 + jaccard_raw * 0.15)
    return round(calibrated, 2)

def get_sequence_matcher_similarity(text1, text2, max_tokens=6000):
    """
    Token-level sequence similarity calibrated for plagiarism detection.
    Measures matching contiguous blocks relative to the shorter text (containment)
    with autojunk=False so repeated terms aren't ignored.
    """
    tokens1 = fast_tokenize(text1)[:max_tokens]
    tokens2 = fast_tokenize(text2)[:max_tokens]
    if not tokens1 or not tokens2:
        return 0.0
        
    matcher = difflib.SequenceMatcher(None, tokens1, tokens2, autojunk=False)
    blocks = matcher.get_matching_blocks()
    matched_tokens = sum(b.size for b in blocks if b.size >= 2)
    min_len = min(len(tokens1), len(tokens2))
    
    if min_len == 0:
        return 0.0
        
    seq_ratio = (matched_tokens / min_len) * 100
    return round(min(seq_ratio, 100.0), 2)

def get_levenshtein_similarity(text1, text2):
    return get_sequence_matcher_similarity(text1, text2)

def get_ngram_similarity(text1, text2):
    """
    Computes bigram and trigram containment to detect multi-word copied phrases.
    """
    words1 = fast_tokenize(text1)
    words2 = fast_tokenize(text2)
    
    if not words1 or not words2:
        return 0.0
        
    def make_ngrams(w_list, n):
        return set(zip(*[w_list[i:] for i in range(n)])) if len(w_list) >= n else set()
        
    bi1, bi2 = make_ngrams(words1, 2), make_ngrams(words2, 2)
    tri1, tri2 = make_ngrams(words1, 3), make_ngrams(words2, 3)
    
    if not bi1 or not bi2:
        return get_jaccard_similarity(text1, text2)
        
    bi_score = (len(bi1 & bi2) / min(len(bi1), len(bi2))) * 100 if min(len(bi1), len(bi2)) else 0.0
    tri_score = (len(tri1 & tri2) / min(len(tri1), len(tri2))) * 100 if (tri1 and tri2 and min(len(tri1), len(tri2))) else bi_score
    
    return round(bi_score * 0.6 + tri_score * 0.4, 2)

def get_lcs_similarity(text1, text2, max_tokens=6000):
    """
    Computes Longest Common Subsequence percentage by summing all matching blocks
    relative to the shorter document.
    """
    tokens1 = fast_tokenize(text1)[:max_tokens]
    tokens2 = fast_tokenize(text2)[:max_tokens]
    
    if not tokens1 or not tokens2:
        return 0.0
        
    matcher = difflib.SequenceMatcher(None, tokens1, tokens2, autojunk=False)
    blocks = matcher.get_matching_blocks()
    
    matched_words = sum(b.size for b in blocks if b.size >= 2)
    min_length = min(len(tokens1), len(tokens2))
    
    if min_length == 0:
        return 0.0
        
    return round(min((matched_words / min_length) * 100, 100.0), 2)

def calculate_all_similarities(text1, text2):
    """
    Calculates weighted composite similarity score across all algorithms.
    """
    cosine = get_cosine_similarity(text1, text2)
    jaccard = get_jaccard_similarity(text1, text2)
    sequence = get_sequence_matcher_similarity(text1, text2)
    ngram = get_ngram_similarity(text1, text2)
    lcs = get_lcs_similarity(text1, text2)
    
    weights = {
        "cosine": 0.25,
        "jaccard": 0.20,
        "sequence": 0.20,
        "ngram": 0.15,
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
        "cosine": cosine,
        "jaccard": jaccard,
        "sequence": sequence,
        "ngram": ngram,
        "spacy": 0.0,
        "lcs": lcs,
        "overall": round(min(overall, 100.0), 2)
    }

def extract_keywords(text, top_n=10):
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
