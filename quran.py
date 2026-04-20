from pathlib import Path
import shutil
import fitz  # PyMuPDF
from PIL import Image

PDF_PATH = r"C:\Users\Hasan\Downloads\AlQuran  15Lines-Saudi Color Print.pdf"
OUTPUT_DIR = r"C:\dev\JMN-app\assets\images\Quran 15 line indo-pak\Full"
DPI = 200
JPEG_QUALITY = 92

# PDF page to start from (1-based)
START_PAGE = 5


def clear_output_folder(output_dir: Path) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for item in output_dir.iterdir():
        if item.is_file() or item.is_symlink():
            item.unlink()
        elif item.is_dir():
            shutil.rmtree(item)


def pdf_to_images(
    pdf_path: str,
    output_dir: str,
    dpi: int = 200,
    jpeg_quality: int = 92,
    start_page: int = 1,
) -> None:
    pdf_file = Path(pdf_path)
    out_dir = Path(output_dir)

    if not pdf_file.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_file}")

    doc = fitz.open(pdf_file)

    if start_page < 1 or start_page > len(doc):
        doc.close()
        raise ValueError(f"START_PAGE must be between 1 and {len(doc)}")

    clear_output_folder(out_dir)

    zoom = dpi / 72
    matrix = fitz.Matrix(zoom, zoom)

    try:
        output_index = 1
        for page_num in range(start_page - 1, len(doc)):
            page = doc.load_page(page_num)
            pix = page.get_pixmap(matrix=matrix, alpha=False)
            output_file = out_dir / f"{output_index}.jpg"

            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            img.save(output_file, "JPEG", quality=jpeg_quality, optimize=True)

            print(f"Saved PDF page {page_num + 1} as {output_file.name}")
            output_index += 1
    finally:
        doc.close()


if __name__ == "__main__":
    pdf_to_images(PDF_PATH, OUTPUT_DIR, DPI, JPEG_QUALITY, START_PAGE)
    print("Done.")