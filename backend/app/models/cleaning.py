# app/models/cleaning.py
from pydantic import BaseModel
from typing import List, Optional, Literal, Dict, Any

HandleMissingStrategy = Literal["drop_rows", "fill_constant", "fill_mean", "fill_median", "fill_mode"]

class MissingValueOption(BaseModel):
    strategy: HandleMissingStrategy
    # used when strategy == "fill_constant"
    constant_value: Optional[str] = None
    # columns to apply; if omitted apply to all columns
    columns: Optional[List[str]] = None

class TextCleaningOptions(BaseModel):
    """Options for cleaning text columns (e.g., tweets)"""
    # Column name(s) to apply text cleaning to
    text_columns: Optional[List[str]] = None
    
    # Text cleaning flags
    remove_urls: bool = True
    remove_retweets: bool = True
    remove_hashtags: bool = True
    remove_mentions: bool = True
    remove_numbers: bool = True
    remove_html_tags: bool = True
    remove_extra_spaces: bool = True
    remove_contradictory_emojis: bool = True
    remove_not_french: bool = False
    remove_not_english: bool = False

class ColumnValidationOptions(BaseModel):
    """Options for validating and filtering rows based on column constraints"""
    # Column name to validate
    column: str
    
    # Validation type
    validation_type: Literal["polarity", "unique_id", "date", "not_empty", "max_length"]
    
    # Validation parameters
    allowed_values: Optional[List[Any]] = None  # For polarity or other enum-like validations
    max_length: Optional[int] = None  # For max_length validation
    date_format: Optional[str] = None  # For date validation

class CleaningOptions(BaseModel):
    # If provided, only these columns will be kept (others dropped)
    # Can be a list of dicts with {"index": int, "name": str} or list of strings (for backward compatibility)
    keep_columns: Optional[List[Any]] = None

    # Remove exact duplicate rows (True/False)
    remove_duplicates: bool = False

    # Missing value handling rules (one or more)
    missing_value_options: Optional[List[MissingValueOption]] = None

    # Text cleaning options
    text_cleaning: Optional[TextCleaningOptions] = None

    # Column validation options (for filtering rows)
    column_validations: Optional[List[ColumnValidationOptions]] = None

    # optional: number of rows to preview after cleaning (for quick feedback)
    preview_top_n: Optional[int] = 5