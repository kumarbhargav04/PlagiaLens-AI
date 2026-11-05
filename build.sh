#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt
python -c "import nltk; nltk.download('stopwords'); nltk.download('wordnet'); nltk.download('punkt_tab'); nltk.download('punkt')" || true
