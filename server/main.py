"""
FastAPI application for converting Markdown to indexed PDF.
"""

import shutil
import subprocess
import tempfile
from pathlib import Path

from fastapi import BackgroundTasks, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from utils.typst_runner import compile_pdf

app = FastAPI(
    title="PDF with Index Generator",
    description="Convert Markdown to PDF with automatic indexing",
    version="1.0.0",
)

# Enable CORS for client-side requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for Tampermonkey
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get the directory where this script is located
BASE_DIR = Path(__file__).parent


def cleanup_temp_dir(temp_dir: str) -> None:
    """Clean up temporary directory."""
    shutil.rmtree(temp_dir, ignore_errors=True)


class PDFRequest(BaseModel):
    """Request model for PDF generation."""

    title: str
    content: str


@app.get("/")
async def root() -> dict:
    """Root endpoint for health check."""
    return {"status": "ok", "message": "PDF with Index Generator is running"}


@app.get("/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "healthy"}


@app.post("/generate-pdf")
async def generate_pdf(
    request: PDFRequest,
    background_tasks: BackgroundTasks,
) -> FileResponse:
    """
    Generate a PDF with automatic indexing from Markdown content.

    Args:
        request: PDFRequest containing title and content

    Returns:
        FileResponse with the generated PDF
    """
    # Create temporary directory
    temp_dir = tempfile.mkdtemp()
    temp_path = Path(temp_dir)

    try:
        # Save input markdown
        input_md = temp_path / "input.md"
        input_md.write_text(request.content, encoding="utf-8")

        # Get filter path
        filter_path = BASE_DIR / "filters" / "auto_index.py"

        # Run Pandoc with the filter to generate Typst content
        body_typ = temp_path / "body.typ"
        pandoc_cmd = [
            "pandoc",
            str(input_md),
            "-t",
            "typst",
            "--filter",
            str(filter_path),
            "-o",
            str(body_typ),
        ]

        try:
            subprocess.run(
                pandoc_cmd,
                capture_output=True,
                text=True,
                check=True,
                timeout=30,
            )
        except subprocess.CalledProcessError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Pandoc conversion failed: {e.stderr}",
            ) from e
        except subprocess.TimeoutExpired as e:
            raise HTTPException(
                status_code=500,
                detail="Pandoc conversion timed out",
            ) from e

        # Copy main template
        template_src = BASE_DIR / "templates" / "main.typ"
        main_typ = temp_path / "main.typ"

        # Read and modify template to set title
        template_content = template_src.read_text(encoding="utf-8")
        # Replace the title state initialization with the actual title
        escaped_title = request.title.replace("\\", "\\\\").replace('"', '\\"')
        modified_template = template_content.replace(
            '#let doc-title = state("doc-title", "Document")',
            f'#let doc-title = state("doc-title", "{escaped_title}")',
        )
        main_typ.write_text(modified_template, encoding="utf-8")

        # Compile to PDF
        output_pdf = temp_path / "output.pdf"
        success, message = compile_pdf(
            input_file=main_typ,
            output_file=output_pdf,
            root_dir=temp_path,
        )

        if not success:
            raise HTTPException(
                status_code=500,
                detail=f"Typst compilation failed: {message}",
            )

        if not output_pdf.exists():
            raise HTTPException(
                status_code=500,
                detail="PDF file was not generated",
            )

        # Return the PDF file
        # Schedule cleanup after response is sent
        safe_title = "".join(
            c for c in request.title if c.isalnum() or c in (" ", "-", "_")
        )[:50]
        filename = f"{safe_title or 'document'}.pdf"

        background_tasks.add_task(cleanup_temp_dir, temp_dir)

        return FileResponse(
            path=str(output_pdf),
            media_type="application/pdf",
            filename=filename,
        )

    except HTTPException:
        # Re-raise HTTP exceptions
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise
    except Exception as e:
        # Clean up and raise error
        shutil.rmtree(temp_dir, ignore_errors=True)
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error: {e!s}",
        ) from e


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
