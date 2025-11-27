"""
Typst CLI execution wrapper.
Handles Typst compilation and font verification.
"""

import subprocess
from pathlib import Path


def check_fonts() -> list[str]:
    """
    Check available fonts recognized by Typst.

    Returns:
        List of available font names
    """
    result = subprocess.run(
        ["typst", "fonts"],
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip().split("\n")


def compile_pdf(
    input_file: Path,
    output_file: Path,
    root_dir: Path | None = None,
) -> tuple[bool, str]:
    """
    Compile a Typst file to PDF.

    Args:
        input_file: Path to the input .typ file
        output_file: Path to the output .pdf file
        root_dir: Optional root directory for file resolution

    Returns:
        Tuple of (success: bool, message: str)
    """
    cmd = ["typst", "compile"]

    if root_dir:
        cmd.extend(["--root", str(root_dir)])

    cmd.extend([str(input_file), str(output_file)])

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,  # 60 second timeout
        )

        if result.returncode == 0:
            return True, "Compilation successful"

        return False, f"Compilation failed: {result.stderr}"
    except subprocess.TimeoutExpired:
        return False, "Compilation timed out"
    except FileNotFoundError:
        return False, "Typst CLI not found. Please install Typst."


def verify_japanese_fonts() -> bool:
    """
    Verify that Japanese fonts are available.

    Returns:
        True if Japanese fonts are found
    """
    fonts = check_fonts()
    japanese_font_patterns = [
        "Noto Sans CJK JP",
        "Noto Sans JP",
        "Noto Serif CJK JP",
        "IPAexGothic",
        "IPAexMincho",
    ]

    for font in fonts:
        for pattern in japanese_font_patterns:
            if pattern.lower() in font.lower():
                return True

    return False


if __name__ == "__main__":
    # Test font availability
    print("Available fonts:")
    for font in check_fonts():
        print(f"  - {font}")

    print(f"\nJapanese fonts available: {verify_japanese_fonts()}")
