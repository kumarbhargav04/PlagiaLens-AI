import re

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

_STOPWORDS_CACHE = None
_LEMMATIZER = None
_LEMMA_CACHE = {}

def get_stopwords():
    global _STOPWORDS_CACHE
    if _STOPWORDS_CACHE is None:
        try:
            from nltk.corpus import stopwords
            _STOPWORDS_CACHE = set(stopwords.words('english'))
        except Exception:
            _STOPWORDS_CACHE = DEFAULT_STOPWORDS
    return _STOPWORDS_CACHE

def get_lemmatizer():
    global _LEMMATIZER
    if _LEMMATIZER is None:
        try:
            from nltk.stem import WordNetLemmatizer
            _LEMMATIZER = WordNetLemmatizer()
            # Pre-warm WordNet dictionary so user requests don't pay 5-second disk penalty
            _LEMMATIZER.lemmatize('test')
        except Exception:
            _LEMMATIZER = False
    return _LEMMATIZER if _LEMMATIZER is not False else None

def preprocess_text(text):
    """
    Cleans and preprocesses the text for analysis with sub-second execution:
    - Lowercases
    - Fast regex-based cleaning
    - Stopword filtering
    - Global dictionary-memoized lemmatization
    """
    if not text:
        return ""
    
    # 1. Lowercase & replace non-letters with spaces
    text_clean = re.sub(r'[^a-z\s]', ' ', text.lower())
    
    # 2. Fast tokenization via whitespace split
    tokens = text_clean.split()
    if not tokens:
        return ""
        
    stop_words = get_stopwords()
    lemmatizer = get_lemmatizer()
    
    # 3. Filter stopwords & Lemmatize efficiently with persistent memoization
    if lemmatizer:
        global _LEMMA_CACHE
        # Find unique words not yet in our global cache
        unseen_words = set(w for w in tokens if w not in stop_words and len(w) > 1 and w not in _LEMMA_CACHE)
        for word in unseen_words:
            try:
                _LEMMA_CACHE[word] = lemmatizer.lemmatize(word)
            except Exception:
                _LEMMA_CACHE[word] = word
                
        cleaned_tokens = [_LEMMA_CACHE[w] for w in tokens if w in _LEMMA_CACHE]
    else:
        cleaned_tokens = [w for w in tokens if w not in stop_words and len(w) > 1]
    
    # 4. Join normalized text
    return ' '.join(cleaned_tokens)
