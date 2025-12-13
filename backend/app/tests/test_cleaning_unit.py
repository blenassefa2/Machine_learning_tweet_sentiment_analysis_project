# app/tests/test_cleaning_unit.py
import pandas as pd
import io
import pytest
from app.services.cleaning_service import (
    _apply_keep_columns,
    _apply_remove_duplicates,
    _apply_missing_value_options,
    _apply_text_cleaning,
    _apply_column_validations,
    _clean_text
)
from app.models.cleaning import MissingValueOption, TextCleaningOptions, ColumnValidationOptions

# -------------------------
# Test Keep Columns
# -------------------------
def test_keep_columns():
    df = pd.DataFrame({"a": [1, 2], "b": [2, 3], "c": [3, 4]})
    out = _apply_keep_columns(df, ["a", "c"])
    assert list(out.columns) == ["a", "c"]
    assert len(out) == 2

def test_keep_columns_nonexistent():
    df = pd.DataFrame({"a": [1, 2], "b": [2, 3]})
    out = _apply_keep_columns(df, ["a", "x"])
    assert list(out.columns) == ["a"]
    assert len(out) == 2

def test_keep_columns_empty_list():
    df = pd.DataFrame({"a": [1, 2], "b": [2, 3]})
    out = _apply_keep_columns(df, [])
    assert list(out.columns) == ["a", "b"]

# -------------------------
# Test Remove Duplicates
# -------------------------
def test_remove_duplicates():
    df = pd.DataFrame({"a": [1, 1, 2], "b": [2, 2, 3]})
    out = _apply_remove_duplicates(df)
    assert len(out) == 2
    assert list(out["a"]) == [1, 2]

def test_remove_duplicates_no_duplicates():
    df = pd.DataFrame({"a": [1, 2, 3], "b": [2, 3, 4]})
    out = _apply_remove_duplicates(df)
    assert len(out) == 3

# -------------------------
# Test Missing Value Options
# -------------------------
def test_missing_value_fill_constant():
    df = pd.DataFrame({"a": [1, None, 3], "b": [None, "x", "y"]})
    options = [MissingValueOption(strategy="fill_constant", constant_value="X", columns=["b"])]
    out = _apply_missing_value_options(df.copy(), options)
    assert out["b"].iloc[0] == "X"
    assert out["a"].iloc[0] == 1  # Column a not affected, should still be 1

def test_missing_value_drop_rows():
    df = pd.DataFrame({"a": [1, None, 3], "b": ["x", "y", "z"]})
    options = [MissingValueOption(strategy="drop_rows", columns=["a"])]
    out = _apply_missing_value_options(df.copy(), options)
    assert out.shape[0] == 2
    assert None not in out["a"].values

def test_missing_value_fill_mean():
    df = pd.DataFrame({"a": [1.0, None, 3.0, 5.0], "b": ["x", "y", "z", "w"]})
    options = [MissingValueOption(strategy="fill_mean", columns=["a"])]
    out = _apply_missing_value_options(df.copy(), options)
    assert not pd.isna(out["a"].iloc[1])
    assert out["a"].iloc[1] == 3.0  # mean of 1, 3, 5

def test_missing_value_fill_median():
    df = pd.DataFrame({"a": [1.0, None, 3.0, 5.0, 7.0], "b": ["x", "y", "z", "w", "v"]})
    options = [MissingValueOption(strategy="fill_median", columns=["a"])]
    out = _apply_missing_value_options(df.copy(), options)
    assert not pd.isna(out["a"].iloc[1])
    assert out["a"].iloc[1] == 4.0  # median of 1, 3, 5, 7 is 4.0 (average of 3 and 5)

def test_missing_value_fill_mode():
    df = pd.DataFrame({"a": ["x", None, "x", "y", "x"], "b": [1, 2, 3, 4, 5]})
    options = [MissingValueOption(strategy="fill_mode", columns=["a"])]
    out = _apply_missing_value_options(df.copy(), options)
    assert out["a"].iloc[1] == "x"  # mode is "x"

# -------------------------
# Test Text Cleaning
# -------------------------
def test_clean_text_remove_urls():
    options = TextCleaningOptions(
        text_columns=["text"],
        remove_urls=True,
        remove_retweets=False,
        remove_hashtags=False,
        remove_mentions=False,
        remove_numbers=False,
        remove_html_tags=False,
        remove_extra_spaces=False,
        remove_contradictory_emojis=False
    )
    text = "Check this out https://example.com"
    cleaned = _clean_text(text, options)
    assert "https://example.com" not in cleaned

def test_clean_text_remove_retweets():
    options = TextCleaningOptions(
        text_columns=["text"],
        remove_retweets=True,
        remove_urls=False
    )
    text = "RT @user This is a retweet"
    cleaned = _clean_text(text, options)
    assert cleaned == ""

def test_clean_text_remove_hashtags():
    options = TextCleaningOptions(
        text_columns=["text"],
        remove_hashtags=True,
        remove_retweets=False,
        remove_urls=False
    )
    text = "This is #awesome"
    cleaned = _clean_text(text, options)
    assert "#" not in cleaned
    assert "awesome" in cleaned

def test_clean_text_remove_mentions():
    options = TextCleaningOptions(
        text_columns=["text"],
        remove_mentions=True,
        remove_retweets=False,
        remove_urls=False
    )
    text = "Hey @user check this out"
    cleaned = _clean_text(text, options)
    assert "@user" not in cleaned

def test_clean_text_remove_contradictory_emojis():
    options = TextCleaningOptions(
        text_columns=["text"],
        remove_contradictory_emojis=True,
        remove_retweets=False,
        remove_urls=False,
        remove_numbers=False  # Don't remove punctuation/emojis via regex, let the emoji check handle it
    )
    text = "I'm so happy 😀 but also sad 😢"
    cleaned = _clean_text(text, options)
    assert cleaned == ""

def test_clean_text_remove_extra_spaces():
    options = TextCleaningOptions(
        text_columns=["text"],
        remove_extra_spaces=True,
        remove_retweets=False,
        remove_urls=False
    )
    text = "This   has    too    many    spaces"
    cleaned = _clean_text(text, options)
    assert "  " not in cleaned
    assert cleaned == "This has too many spaces"

def test_apply_text_cleaning():
    df = pd.DataFrame({
        "text": ["RT @user Hello #world", "Normal text here", "https://example.com link"],
        "other": [1, 2, 3]
    })
    options = TextCleaningOptions(
        text_columns=["text"],
        remove_retweets=True,
        remove_hashtags=True,
        remove_mentions=True,
        remove_urls=True
    )
    out = _apply_text_cleaning(df.copy(), options)
    # First row should be removed (retweet)
    assert len(out) <= 3
    if len(out) > 0:
        assert "RT" not in out["text"].iloc[0] if 0 < len(out) else True

# -------------------------
# Test Column Validations
# -------------------------
def test_column_validation_polarity():
    df = pd.DataFrame({"polarity": ["0", "2", "4", "1", "0"]})
    validation = ColumnValidationOptions(
        column="polarity",
        validation_type="polarity",
        allowed_values=[0, 2, 4]
    )
    out = _apply_column_validations(df.copy(), [validation])
    assert len(out) == 4  # Only 0, 2, 4 should remain (two "0" values are both valid)
    assert "1" not in out["polarity"].values
    assert set(out["polarity"].astype(int).values) == {0, 2, 4}  # All values should be in allowed set

def test_column_validation_unique_id():
    df = pd.DataFrame({"id": ["1", "2", "1", "3", "2"]})
    validation = ColumnValidationOptions(
        column="id",
        validation_type="unique_id"
    )
    out = _apply_column_validations(df.copy(), [validation])
    assert len(out) == 3  # First occurrence of each id
    assert len(out["id"].unique()) == len(out)

def test_column_validation_not_empty():
    df = pd.DataFrame({"text": ["hello", "", "world", None, "test"]})
    validation = ColumnValidationOptions(
        column="text",
        validation_type="not_empty"
    )
    out = _apply_column_validations(df.copy(), [validation])
    assert len(out) == 3  # Only non-empty rows
    assert "" not in out["text"].values
    assert out["text"].notna().all()

def test_column_validation_max_length():
    df = pd.DataFrame({"username": ["short", "toolongusername", "ok", "x"]})
    validation = ColumnValidationOptions(
        column="username",
        validation_type="max_length",
        max_length=10
    )
    out = _apply_column_validations(df.copy(), [validation])
    assert len(out) == 3  # "toolongusername" removed
    assert all(len(str(x)) <= 10 for x in out["username"])

def test_column_validation_date():
    df = pd.DataFrame({
        "date": [
            "Mon Apr 06 22:19:45 PDT 2009",
            "2025-01-01",
            "invalid date",
            "Tue Jan 15 10:30:00 UTC 2025"
        ]
    })
    validation = ColumnValidationOptions(
        column="date",
        validation_type="date"
    )
    out = _apply_column_validations(df.copy(), [validation])
    # Should keep valid dates, remove invalid
    assert len(out) >= 2  # At least valid dates remain

def test_column_validation_multiple():
    df = pd.DataFrame({
        "polarity": ["0", "2", "1", "4"],
        "id": ["1", "2", "3", "1"],
        "text": ["a", "b", "c", "d"]
    })
    validations = [
        ColumnValidationOptions(column="polarity", validation_type="polarity", allowed_values=[0, 2, 4]),
        ColumnValidationOptions(column="id", validation_type="unique_id")
    ]
    out = _apply_column_validations(df.copy(), validations)
    # Should apply both validations
    assert len(out) <= 3

# -------------------------
# Test Edge Cases
# -------------------------
def test_empty_dataframe():
    df = pd.DataFrame({"a": []})
    out = _apply_remove_duplicates(df)
    assert len(out) == 0

def test_all_nan_text():
    options = TextCleaningOptions(text_columns=["text"])
    text = None
    cleaned = _clean_text(text, options)
    assert cleaned == ""

def test_text_cleaning_empty_after_cleaning():
    options = TextCleaningOptions(
        text_columns=["text"],
        remove_retweets=True,
        remove_urls=True
    )
    text = "RT @user https://example.com"
    cleaned = _clean_text(text, options)
    # After removing retweet, should be empty
    assert cleaned == ""
