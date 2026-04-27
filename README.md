# PDF to TXT Converter Utility

A simple command-line tool to convert PDF files to plain text format.

## Features

- Convert single or multiple PDF files to text
- Preserves text formatting and layout as much as possible
- Batch processing mode for multiple files
- Simple and intuitive command-line interface
- No external dependencies beyond PyPDF2

## Installation

1. Clone this repository or download the files
2. Install the required dependency:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Single File Conversion
```bash
python pdf_to_txt_converter.py document.pdf
```
This will create `document.txt` in the same directory.

### Specify Output File
```bash
python pdf_to_txt_converter.py document.pdf -o output.txt
```

### Batch Conversion (Multiple Files)
```bash
python pdf_to_txt_converter.py file1.pdf file2.pdf file3.pdf --batch
```
Each PDF will be converted to a corresponding TXT file with the same base name.

### Wildcard Support
```bash
python pdf_to_txt_converter.py *.pdf --batch
```

## Requirements

- Python 3.6+
- PyPDF2 (installed via requirements.txt)

## How It Works

The utility uses the PyPDF2 library to:
1. Open and read PDF files
2. Extract text content from each page
3. Combine all page text into a single output file
4. Preserve basic text formatting and spacing

## Limitations

- Complex PDF layouts (columns, tables, images) may not convert perfectly
- Encrypted or password-protected PDFs are not supported
- Text extraction quality depends on the original PDF structure

## License

MIT License - feel free to modify and distribute as needed.