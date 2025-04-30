import os
from pdfminer.high_level import extract_text

def pdf_to_markdown(pdf_path, md_path):
    text = extract_text(pdf_path)
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(text)

if __name__ == "__main__":
    pdf_dir = "doc"
    for filename in os.listdir(pdf_dir):
        if filename.endswith(".pdf"):
            pdf_path = os.path.join(pdf_dir, filename)
            md_filename = os.path.splitext(filename)[0] + ".md"
            md_path = os.path.join(pdf_dir, md_filename)
            pdf_to_markdown(pdf_path, md_path)
