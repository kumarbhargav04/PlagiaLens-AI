from nltk.tokenize import sent_tokenize
from .similarity import get_cosine_similarity, get_sequence_matcher_similarity
import re

def find_matching_sentences(text1, text2, threshold=40):
    """
    Compares sentences from text1 against text2 and returns a list of matches.
    """
    sentences1 = sent_tokenize(text1)
    sentences2 = sent_tokenize(text2)
    
    matches_in_text1 = []
    
    for i, s1 in enumerate(sentences1):
        if len(s1.split()) < 4:  # Skip very short sentences
            continue
            
        best_match = None
        best_score = 0
        
        for j, s2 in enumerate(sentences2):
            if len(s2.split()) < 4:
                continue
                
            # Quick check with sequence matcher
            seq_score = get_sequence_matcher_similarity(s1, s2)
            if seq_score > best_score:
                best_score = seq_score
                best_match = s2
                
        if best_score >= threshold:
            # Color coding based on score
            if best_score >= 80:
                color = "red"
            elif best_score >= 60:
                color = "orange"
            else:
                color = "yellow"
                
            matches_in_text1.append({
                "sentence": s1,
                "matchedWith": best_match,
                "score": round(best_score, 2),
                "color": color
            })
            
    return matches_in_text1
