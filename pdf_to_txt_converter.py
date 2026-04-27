#!/usr/bin/env python3
"""
PDF to TXT Converter Utility
A simple command-line tool to convert PDF files to plain text.
"""

import sys
import argparse
import os

try:
    import PyPDF2
except ImportError:
    print("Error: PyPDF2 is not installed. Please install it using:")
    print("pip install PyPDF2")
    sys.exit(1)

def pdf_to_txt(pdf_path, txt_path=None):
    """
    Convert PDF file to text file.
    
    Args:
        pdf_path (str): Path to input PDF file
        txt_path (str): Path to output TXT file (optional)
    
    Returns:
        str: Path to the created text file
    """
    # Validate input file
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")
    
    if not pdf_path.lower().endswith('.pdf'):
        raise ValueError("Input file must be a PDF file")
    
    # Determine output path if not provided
    if txt_path is None:
        base_name = os.path.splitext(pdf_path)[0]
        txt_path = base_name + '.txt'
    
    # Read PDF and extract text
    text_content = []
    
    try:
        with open(pdf_path, 'rb') as pdf_file:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            
            # Extract text from each page
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text_content.append(page.extract_text())
                
    except Exception as e:
        raise RuntimeError(f"Error reading PDF file: {str(e)}")
    
    # Write text to output file
    try:
        with open(txt_path, 'w', encoding='utf-8') as txt_file:
            txt_file.write('\n'.join(text_content))
    except Exception as e:
        raise RuntimeError(f"Error writing text file: {str(e)}")
    
    return txt_path

def main():
    parser = argparse.ArgumentParser(
        description='Convert PDF files to plain text format.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog='''
Examples:
  python pdf_to_txt_converter.py document.pdf
  python pdf_to_txt_converter.py document.pdf -o output.txt
  python pdf_to_txt_converter.py *.pdf --batch
        '''
    )
    
    parser.add_argument('pdf_files', nargs='+', help='PDF file(s) to convert')
    parser.add_argument('-o', '--output', help='Output TXT file path (for single file)')
    parser.add_argument('-b', '--batch', action='store_true', 
                       help='Process multiple PDF files (output will be same name with .txt extension)')
    parser.add_argument('--version', action='version', version='PDF to TXT Converter v1.0')
    
    args = parser.parse_args()
    
    # Handle batch mode
    if args.batch and len(args.pdf_files) > 1:
        for pdf_file in args.pdf_files:
            try:
                txt_file = pdf_to_txt(pdf_file)
                print(f"✓ Converted: {pdf_file} → {txt_file}")
            except Exception as e:
                print(f"✗ Error converting {pdf_file}: {str(e)}")
        return
    
    # Handle single file or multiple files without batch
    if len(args.pdf_files) == 1:
        try:
            txt_file = pdf_to_txt(args.pdf_files[0], args.output)
            print(f"✓ Successfully converted: {args.pdf_files[0]} → {txt_file}")
        except Exception as e:
            print(f"✗ Error: {str(e)}")
            sys.exit(1)
    else:
        # Multiple files specified without batch flag
        if args.output:
            print("Error: Output file can only be specified when converting a single PDF file")
            sys.exit(1)
        
        print("Converting multiple files (use --batch flag for explicit batch mode):")
        for pdf_file in args.pdf_files:
            try:
                txt_file = pdf_to_txt(pdf_file)
                print(f"  ✓ {pdf_file} → {txt_file}")
            except Exception as e:
                print(f"  ✗ {pdf_file}: {str(e)}")

if __name__ == "__main__":
    main()