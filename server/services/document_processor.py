import os
import re

def process_document(file_path):
    """
    Extracts text from a given file path based on its extension.
    Optimized for high speed, low memory consumption, and large documents.
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
        
    if not text or not text.strip():
        raise ValueError("No extractable text was found in this file. (If this is a scanned PDF or image, text extraction is not possible without OCR).")
        
    return text

def read_txt(file_path):
    """Reads a text file with encoding fallback."""
    for encoding in ['utf-8', 'latin-1', 'cp1252']:
        try:
            with open(file_path, 'r', encoding=encoding, errors='ignore') as f:
                return f.read()
        except Exception:
            continue
    with open(file_path, 'rb') as f:
        return f.read().decode('utf-8', errors='ignore')

def read_pdf(file_path, max_pages=150):
    """
    Extracts text from PDF files quickly using PyPDF2 stream parser first (10x faster, ~10MB RAM).
    Falls back to pdfplumber only if PyPDF2 yields empty text.
    """
    text_chunks = []
    
    # 1. Primary extractor: PyPDF2 (fast & memory-safe)
    try:
        import PyPDF2
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            num_pages = len(reader.pages)
            limit = min(num_pages, max_pages)
            for i in range(limit):
                page = reader.pages[i]
                page_text = page.extract_text()
                if page_text:
                    text_chunks.append(page_text)
                    
        extracted = "\n".join(text_chunks).strip()
        if extracted:
            return extracted
    except Exception as e:
        print(f"PyPDF2 extraction note: {e}")

    # 2. Fallback extractor: pdfplumber (for PDFs with special font encodings)
    try:
        import pdfplumber
        text_chunks = []
        with pdfplumber.open(file_path) as pdf:
            limit = min(len(pdf.pages), max_pages)
            for i in range(limit):
                page_text = pdf.pages[i].extract_text()
                if page_text:
                    text_chunks.append(page_text)
        return "\n".join(text_chunks).strip()
    except Exception as e:
        print(f"pdfplumber extraction note: {e}")
        
    return "\n".join(text_chunks).strip()

def read_docx(file_path):
    """
    Extracts text from Word documents.
    Handles standard .docx files via python-docx, and gracefully handles legacy .doc or corrupted files.
    """
    try:
        import docx
        doc = docx.Document(file_path)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        # Also extract table text if present
        for table in doc.tables:
            for row in table.rows:
                row_text = ' '.join([cell.text.strip() for cell in row.cells if cell.text.strip()])
                if row_text:
                    paragraphs.append(row_text)
        return '\n'.join(paragraphs)
    except Exception as e:
        # Fallback for binary legacy .doc or non-zip Word files
        try:
            with open(file_path, 'rb') as f:
                content = f.read()
            # Extract readable ascii/unicode strings
            words = re.findall(rb'[\x20-\x7E\t\r\n]{4,}', content)
            raw = '\n'.join([w.decode('latin1', errors='ignore') for w in words])
            if raw.strip():
                return raw
        except Exception:
            pass
        raise ValueError(f"Unable to parse Word document ({str(e)}). Please save as .docx or .txt and re-upload.")
