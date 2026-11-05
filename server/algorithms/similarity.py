import math
import difflib
import re
from collections import Counter

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
except Exception:
    SPACY_AVAILABLE = False
    nlp = None

def safe_word_tokenize(text):
    if not text:
        return []
    try:
        from nltk.tokenize import word_tokenize
        return word_tokenize(text)
    except Exception:
        return re.findall(r'\b\w+\b', text)

def safe_sent_tokenize(text):
    if not text:
        return []
    try:
        from nltk.tokenize import sent_tokenize
        return sent_tokenize(text)
    except Exception:
        sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
        return sentences if sentences else [text]

def get_cosine_similarity(text1, text2):
    words1 = safe_word_tokenize(text1.lower())
    words2 = safe_word_tokenize(text2.lower())
    
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
    set1 = set(safe_word_tokenize(text1.lower()))
    set2 = set(safe_word_tokenize(text2.lower()))
    if not set1 and not set2:
        return 0.0
    intersection = set1.intersection(set2)
    union = set1.union(set2)
    return float(len(intersection)) / len(union) * 100 if union else 0.0

def get_sequence_matcher_similarity(text1, text2):
    return difflib.SequenceMatcher(None, text1, text2).ratio() * 100

def get_levenshtein_similarity(text1, text2):
    return get_sequence_matcher_similarity(text1, text2)

def get_ngram_similarity(text1, text2, n=3):
    def get_ngrams(text, n):
        words = safe_word_tokenize(text.lower())
        return set(zip(*[words[i:] for i in range(n)]))
    
    ngrams1 = get_ngrams(text1, n)
    ngrams2 = get_ngrams(text2, n)
    
    if not ngrams1 and not ngrams2:
        return 0.0
    
    intersection = ngrams1.intersection(ngrams2)
    union = ngrams1.union(ngrams2)
    return float(len(intersection)) / len(union) * 100 if union else 0.0

def get_spacy_similarity(text1, text2):
    if not SPACY_AVAILABLE or not nlp:
        return None
    try:
        doc1 = nlp(text1)
        doc2 = nlp(text2)
        if doc1.vector_norm and doc2.vector_norm:
            return doc1.similarity(doc2) * 100
        return 0.0
    except Exception:
        return None

def get_lcs_similarity(text1, text2):
    tokens1 = safe_word_tokenize(text1.lower())
    tokens2 = safe_word_tokenize(text2.lower())
    
    if not tokens1 or not tokens2:
        return 0.0
        
    matcher = difflib.SequenceMatcher(None, tokens1, tokens2)
    match = matcher.find_longest_match(0, len(tokens1), 0, len(tokens2))
    
    lcs_length = match.size
    min_length = min(len(tokens1), len(tokens2))
    
    return (lcs_length / min_length) * 100 if min_length > 0 else 0.0

def calculate_all_similarities(text1, text2):
    cosine = get_cosine_similarity(text1, text2)
    jaccard = get_jaccard_similarity(text1, text2)
    sequence = get_sequence_matcher_similarity(text1, text2)
    ngram = get_ngram_similarity(text1, text2)
    spacy_sim = get_spacy_similarity(text1, text2)
    lcs = get_lcs_similarity(text1, text2)
    
    weights = {
        "cosine": 0.25,
        "jaccard": 0.15,
        "sequence": 0.20,
        "ngram": 0.20,
        "lcs": 0.20
    }
    
    if spacy_sim is not None:
        weights = {
            "cosine": 0.20,
            "jaccard": 0.10,
            "sequence": 0.15,
            "ngram": 0.15,
            "spacy": 0.20,
            "lcs": 0.20
        }
        overall = (
            cosine * weights["cosine"] +
            jaccard * weights["jaccard"] +
            sequence * weights["sequence"] +
            ngram * weights["ngram"] +
            spacy_sim * weights["spacy"] +
            lcs * weights["lcs"]
        )
    else:
        total_weight = sum(weights.values())
        adjusted_weights = {k: v / total_weight for k, v in weights.items()}
        
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
        "spacy": round(spacy_sim, 2) if spacy_sim is not None else 0.0,
        "lcs": round(lcs, 2),
        "overall": round(overall, 2)
    }

def extract_keywords(text, top_n=10):
    if SPACY_AVAILABLE and nlp:
        doc = nlp(text)
        words = [token.text.lower() for token in doc if token.is_alpha and not token.is_stop]
    else:
        try:
            from nltk.corpus import stopwords
            stop_words = set(stopwords.words('english'))
        except Exception:
            stop_words = set()
        words = [word.lower() for word in safe_word_tokenize(text) if word.isalpha() and word.lower() not in stop_words]
        
    word_freq = Counter(words)
    return [word for word, freq in word_freq.most_common(top_n)]

def get_verdict(score):
    if score <= 20: return "Original"
    elif score <= 40: return "Low Similarity"
    elif score <= 60: return "Moderate Similarity"
    elif score <= 80: return "High Similarity"
    else: return "Highly Plagiarized"
