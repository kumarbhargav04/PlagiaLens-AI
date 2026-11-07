import os
import re

def clean_surrogates(text):
    """Removes invalid unicode surrogate characters from document extractions."""
    if not text:
        return ""
    return text.encode('utf-8', 'ignore').decode('utf-8')

def clean_pdf_artifacts(text):
    """
    Cleans running headers, page numbers, and hyphenated line breaks from PDF text
    so it matches seamlessly with Word and TXT documents.
    """
    if not text:
        return ""
    # 1. Reconnect words hyphenated across line breaks: e.g. "algo-\n rithm" -> "algorithm"
    text = re.sub(r'(\b[a-zA-Z]{2,})-\s*[\r\n]+\s*([a-zA-Z]{2,}\b)', r'\1\2', text)
    # 2. Remove running page markers: e.g. "Page 1 of 50", "Page 2"
    text = re.sub(r'(?i)\bpage\s+\d+(\s+of\s+\d+)?\b', ' ', text)
    # 3. Remove standalone isolated page numbers on their own lines
    text = re.sub(r'[\r\n]+\s*\d+\s*[\r\n]+', '\n', text)
    # 4. Normalize horizontal whitespace
    text = re.sub(r'[ \t]+', ' ', text)
    return text.strip()

def process_document(file_path):
    """
    Extracts text from a given file path based on its extension.
    Optimized for high speed, low latency, word boundary accuracy, and cross-format matching.
    """
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == '.txt':
        text = read_txt(file_path)
    elif ext == '.pdf':
        text = read_pdf(file_path)
    elif ext in ['.doc', '.docx']:
        text = read_docx(file_path)
    else:
        raise ValueError(f"Unsupported file format: {ext}")
        
    text = clean_surrogates(text)
    
    if not text or not text.strip():
        raise ValueError("No extractable text was found in this file. (If this is a scanned PDF or image, text extraction is not possible without OCR).")
        
    return text

def read_txt(file_path):
    """Reads a text file with encoding fallbacks."""
    for encoding in ['utf-8', 'latin-1', 'cp1252']:
        try:
            with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
                return f.read()
        except Exception:
            continue
    with open(file_path, 'rb') as f:
        return f.read().decode('utf-8', errors='ignore')

def read_pdf(file_path, max_pages=300):
    """
    Extracts text with accurate word spacing and near-instant latency from PDFs.
    Uses pypdfium2 first (native C++ engine, ~0.002s/page with perfect layout & spacing).
    Falls back to pdfplumber and PyPDF2 if needed.
    """
    text_chunks = []
    
    # 1. Primary: pypdfium2 (High-speed native Chromium engine, 50x faster, layout-accurate)
    try:
        import pypdfium2 as pdfium
        doc = pdfium.PdfDocument(file_path)
        limit = min(len(doc), max_pages)
        for i in range(limit):
            textpage = doc[i].get_textpage()
            t = textpage.get_text_range()
            if t and t.strip():
                text_chunks.append(t)
        extracted = "\n".join(text_chunks).strip()
        if extracted:
            return clean_pdf_artifacts(extracted)
    except Exception as e:
        print(f"pypdfium2 extraction notice: {e}")

    # 2. Secondary: pdfplumber (fallback if pypdfium2 unavailable)
    try:
        import pdfplumber
        text_chunks = []
        with pdfplumber.open(file_path) as pdf:
            limit = min(len(pdf.pages), min(max_pages, 50))
            for i in range(limit):
                page_text = pdf.pages[i].extract_text()
                if page_text:
                    text_chunks.append(page_text)
                    
        extracted = "\n".join(text_chunks).strip()
        if extracted:
            return clean_pdf_artifacts(extracted)
    except Exception as e:
        print(f"pdfplumber extraction notice: {e}")

    # 3. Tertiary: PyPDF2 (fast text stream fallback)
    try:
        import PyPDF2
        text_chunks = []
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            limit = min(len(reader.pages), max_pages)
            for i in range(limit):
                page = reader.pages[i]
                page_text = page.extract_text()
                if page_text:
                    text_chunks.append(page_text)
        return clean_pdf_artifacts("\n".join(text_chunks).strip())
    except Exception as e:
        print(f"PyPDF2 extraction notice: {e}")
        
    return clean_pdf_artifacts("\n".join(text_chunks).strip())

def read_docx(file_path, max_paragraphs=3000):
    """
    Extracts text from Word documents (.docx and legacy .doc).
    """
    try:
        import docx
        doc = docx.Document(file_path)
        paragraphs = []
        for p in doc.paragraphs:
            t = p.text.strip()
            if t:
                paragraphs.append(t)
            if len(paragraphs) >= max_paragraphs:
                break
                
        for table in doc.tables:
            if len(paragraphs) >= max_paragraphs:
                break
            for row in table.rows:
                row_text = ' '.join([cell.text.strip() for cell in row.cells if cell.text.strip()])
                if row_text:
                    paragraphs.append(row_text)
                if len(paragraphs) >= max_paragraphs:
                    break
                    
        return '\n'.join(paragraphs)
    except Exception as e:
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            words = re.findall(rb'[\x20-\x7E\t\r\n]{4,}', content)
            raw = '\n'.join([w.decode('latin1', errors='ignore') for w in words])
            if raw.strip():
                return raw
        except Exception:
            pass
        raise ValueError(f"Unable to parse Word document ({str(e)}). Please save as .docx or .txt and re-upload.")
