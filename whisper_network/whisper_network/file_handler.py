#!/usr/bin/env python3
"""
File Handler Module for Whisper Network.
Handles file upload, parsing, anonymization and export with format preservation.

Supports:
- Text files: .txt, .md, .log
- Config files: .conf, .ini, .yaml, .yml, .json, .toml, .env
- Scripts: .sh, .bash, .zsh, .ps1, .py, .js, .ts, .java, .cpp, .cs, etc.

Developed by Sylvain JOLY, NANO by NXO
License: MIT
"""

import os
import logging
import mimetypes
from typing import Optional, Dict, Any, Tuple
from pathlib import Path
import chardet
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class FileType(Enum):
    """Supported file types."""
    TEXT = "text"
    CONFIG = "config"
    SCRIPT = "script"
    UNKNOWN = "unknown"


@dataclass
class FileInfo:
    """Information about uploaded file."""
    filename: str
    size_bytes: int
    mime_type: str
    file_type: FileType
    extension: str
    encoding: str
    content: str


class FileHandler:
    """Handle file upload, parsing and export with format preservation."""
    
    # Maximum file size: 10MB
    MAX_FILE_SIZE = 10 * 1024 * 1024
    
    # Supported extensions by category
    TEXT_EXTENSIONS = {'.txt', '.md', '.log', '.rst', '.csv'}
    CONFIG_EXTENSIONS = {'.conf', '.ini', '.yaml', '.yml', '.json', '.toml', '.env', '.properties', '.cfg'}
    SCRIPT_EXTENSIONS = {
        '.sh', '.bash', '.zsh', '.fish',  # Shell
        '.ps1', '.psm1', '.psd1',  # PowerShell
        '.py', '.pyw',  # Python
        '.js', '.mjs', '.cjs', '.ts', '.tsx',  # JavaScript/TypeScript
        '.java', '.kt', '.scala',  # JVM
        '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp',  # C/C++
        '.cs', '.vb',  # .NET
        '.go', '.rs', '.swift', '.rb', '.php', '.pl', '.lua'  # Other languages
    }
    
    # Supported MIME types
    ALLOWED_MIME_TYPES = {
        'text/plain',
        'text/markdown',
        'text/x-log',
        'text/x-python',
        'text/x-script',
        'text/x-shellscript',
        'application/x-sh',
        'application/x-bash',
        'application/json',
        'application/yaml',
        'application/x-yaml',
        'application/toml',
        'text/x-ini',
        'text/x-properties',
    }
    
    def __init__(self):
        """Initialize file handler."""
        logger.info("FileHandler initialized")
    
    def _detect_encoding(self, file_bytes: bytes) -> str:
        """
        Detect file encoding using chardet.
        
        Args:
            file_bytes: Raw file bytes
            
        Returns:
            Detected encoding (defaults to utf-8)
        """
        try:
            result = chardet.detect(file_bytes)
            encoding = result.get('encoding', 'utf-8')
            confidence = result.get('confidence', 0)
            
            logger.debug(f"Detected encoding: {encoding} (confidence: {confidence:.2%})")
            
            # Fallback to utf-8 if confidence is too low
            if confidence < 0.5:
                logger.warning(f"Low encoding confidence ({confidence:.2%}), defaulting to utf-8")
                return 'utf-8'
            
            return encoding or 'utf-8'
        
        except Exception as e:
            logger.warning(f"Encoding detection failed: {e}, defaulting to utf-8")
            return 'utf-8'
    
    def _get_file_type(self, extension: str) -> FileType:
        """
        Determine file type from extension.
        
        Args:
            extension: File extension (with dot)
            
        Returns:
            FileType enum value
        """
        ext_lower = extension.lower()
        
        if ext_lower in self.TEXT_EXTENSIONS:
            return FileType.TEXT
        elif ext_lower in self.CONFIG_EXTENSIONS:
            return FileType.CONFIG
        elif ext_lower in self.SCRIPT_EXTENSIONS:
            return FileType.SCRIPT
        else:
            return FileType.UNKNOWN
    
    async def validate_file(
        self,
        filename: str,
        file_bytes: bytes
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate uploaded file (size, type, content).
        
        Args:
            filename: Original filename
            file_bytes: Raw file bytes
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            # Check file size
            if len(file_bytes) == 0:
                return False, "File is empty"
            
            if len(file_bytes) > self.MAX_FILE_SIZE:
                size_mb = len(file_bytes) / (1024 * 1024)
                max_mb = self.MAX_FILE_SIZE / (1024 * 1024)
                return False, f"File too large ({size_mb:.2f}MB). Maximum: {max_mb}MB"
            
            # Check extension
            extension = Path(filename).suffix.lower()
            if not extension:
                return False, "File has no extension"
            
            file_type = self._get_file_type(extension)
            if file_type == FileType.UNKNOWN:
                return False, f"Unsupported file type: {extension}"
            
            # Check MIME type
            mime_type, _ = mimetypes.guess_type(filename)
            if mime_type and mime_type not in self.ALLOWED_MIME_TYPES:
                # Don't reject based on MIME alone, extension is more reliable
                logger.warning(f"Unrecognized MIME type {mime_type} for {filename}, but extension {extension} is supported")
            
            # Try to decode content
            encoding = self._detect_encoding(file_bytes)
            try:
                content = file_bytes.decode(encoding)
                if not content.strip():
                    return False, "File contains no readable text"
            except UnicodeDecodeError:
                return False, f"Cannot decode file with detected encoding: {encoding}"
            
            logger.info(f"File validation passed: {filename} ({len(file_bytes)} bytes, {extension}, {file_type.value})")
            return True, None
        
        except Exception as e:
            logger.error(f"File validation error: {e}")
            return False, f"Validation error: {str(e)}"
    
    async def parse_file(
        self,
        filename: str,
        file_bytes: bytes
    ) -> FileInfo:
        """
        Parse uploaded file and extract content.
        
        Args:
            filename: Original filename
            file_bytes: Raw file bytes
            
        Returns:
            FileInfo object with parsed data
            
        Raises:
            ValueError: If file is invalid
        """
        try:
            # Validate first
            is_valid, error_msg = await self.validate_file(filename, file_bytes)
            if not is_valid:
                raise ValueError(error_msg)
            
            # Extract file info
            extension = Path(filename).suffix.lower()
            file_type = self._get_file_type(extension)
            mime_type, _ = mimetypes.guess_type(filename)
            encoding = self._detect_encoding(file_bytes)
            
            # Decode content
            content = file_bytes.decode(encoding)
            
            file_info = FileInfo(
                filename=filename,
                size_bytes=len(file_bytes),
                mime_type=mime_type or 'text/plain',
                file_type=file_type,
                extension=extension,
                encoding=encoding,
                content=content
            )
            
            logger.info(f"File parsed successfully: {filename} ({file_type.value}, {encoding})")
            return file_info
        
        except ValueError:
            raise
        except Exception as e:
            logger.error(f"File parsing error: {e}")
            raise ValueError(f"Failed to parse file: {str(e)}")
    
    async def export_file(
        self,
        original_filename: str,
        anonymized_content: str,
        encoding: str = 'utf-8'
    ) -> Tuple[str, bytes]:
        """
        Export anonymized content with original format.
        
        Args:
            original_filename: Original file name
            anonymized_content: Anonymized text content
            encoding: File encoding (default: utf-8)
            
        Returns:
            Tuple of (new_filename, file_bytes)
        """
        try:
            # Generate new filename: original_name.anonymized.ext
            path = Path(original_filename)
            stem = path.stem
            suffix = path.suffix
            new_filename = f"{stem}.anonymized{suffix}"
            
            # Encode content
            file_bytes = anonymized_content.encode(encoding)
            
            logger.info(f"File exported: {new_filename} ({len(file_bytes)} bytes, {encoding})")
            return new_filename, file_bytes
        
        except Exception as e:
            logger.error(f"File export error: {e}")
            raise ValueError(f"Failed to export file: {str(e)}")
    
    def get_supported_extensions(self) -> Dict[str, list]:
        """
        Get list of all supported file extensions by category.
        
        Returns:
            Dictionary with categories as keys and extension lists as values
        """
        return {
            "text": sorted(list(self.TEXT_EXTENSIONS)),
            "config": sorted(list(self.CONFIG_EXTENSIONS)),
            "script": sorted(list(self.SCRIPT_EXTENSIONS)),
        }
    
    def get_file_size_limit(self) -> Dict[str, Any]:
        """
        Get file size limit information.
        
        Returns:
            Dictionary with size limits in different units
        """
        return {
            "bytes": self.MAX_FILE_SIZE,
            "kb": self.MAX_FILE_SIZE / 1024,
            "mb": self.MAX_FILE_SIZE / (1024 * 1024),
        }
