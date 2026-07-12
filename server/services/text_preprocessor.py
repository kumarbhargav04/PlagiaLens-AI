import re
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

# Setup
stop_words = set(stopwords.words('english'))
lemmatizer = WordNetLemmatizer()

def preprocess_text(text):
    """
    Cleans and preprocesses the text for analysis.
    - Lowercases
    - Removes whitespace, numbers, punctuation
    - Tokenizes
    - Removes stop words
    - Lemmatizes
    """
    if not text: return ""
    
    # 1. Lowercase
    text = text.lower()
    
    # 2. Remove special characters and numbers (keep only letters)
    text = re.sub(r'[^a-z\s]', '', text)
    
    # 3. Tokenize
    tokens = word_tokenize(text)
    
    # 4. Remove stop words & Lemmatize
    cleaned_tokens = [lemmatizer.lemmatize(word) for word in tokens if word not in stop_words]
    
    # 5. Join back to string
    cleaned_text = ' '.join(cleaned_tokens)
    
    # 6. Whitespace normalization
    cleaned_text = re.sub(r'\s+', ' ', cleaned_text).strip()
    
    return cleaned_text
