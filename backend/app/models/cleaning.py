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

class CleaningOptions(BaseModel):
    # If provided, only these columns will be kept (others dropped)
    keep_columns: Optional[List[str]] = None

    # Remove exact duplicate rows (True/False)
    remove_duplicates: bool = True

    # Missing value handling rules (one or more)
    missing_value_options: Optional[List[MissingValueOption]] = None

    # optional: number of rows to preview after cleaning (for quick feedback)
    preview_top_n: Optional[int] = 5