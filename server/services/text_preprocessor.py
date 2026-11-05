import re
import nltk

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

def get_stopwords():
    try:
        from nltk.corpus import stopwords
        return set(stopwords.words('english'))
    except Exception:
        return DEFAULT_STOPWORDS

def get_lemmatizer():
    try:
        from nltk.stem import WordNetLemmatizer
        return WordNetLemmatizer()
    except Exception:
        return None

def tokenize_safe(text):
    try:
        from nltk.tokenize import word_tokenize
        return word_tokenize(text)
    except Exception:
        return re.findall(r'[a-z]+', text)

def preprocess_text(text):
    """
    Cleans and preprocesses the text for analysis.
    - Lowercases
    - Removes whitespace, numbers, punctuation
    - Tokenizes
    - Removes stop words
    - Lemmatizes
    """
    if not text:
        return ""
    
    # 1. Lowercase
    text = text.lower()
    
    # 2. Remove special characters and numbers (keep only letters)
    text = re.sub(r'[^a-z\s]', '', text)
    
    # 3. Tokenize
    tokens = tokenize_safe(text)
    
    # 4. Remove stop words & Lemmatize
    stop_words = get_stopwords()
    lemmatizer = get_lemmatizer()
    
    if lemmatizer:
        try:
            cleaned_tokens = [lemmatizer.lemmatize(word) for word in tokens if word not in stop_words]
        except Exception:
            cleaned_tokens = [word for word in tokens if word not in stop_words]
    else:
        cleaned_tokens = [word for word in tokens if word not in stop_words]
    
    # 5. Join back to string
    cleaned_text = ' '.join(cleaned_tokens)
    
    # 6. Whitespace normalization
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()
    
    return cleaned_text
