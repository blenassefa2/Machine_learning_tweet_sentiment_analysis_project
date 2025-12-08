# app/tests/test_cleaning_unit.py
import pandas as pd
import io
from app.services.cleaning_service import _apply_keep_columns, _apply_remove_duplicates, _apply_missing_value_options
from app.models.cleaning import MissingValueOption

def test_keep_columns():
    df = pd.DataFrame({"a":[1], "b":[2], "c":[3]})
    out = _apply_keep_columns(df, ["a","c"])
    assert list(out.columns) == ["a","c"]

def test_remove_duplicates():
    df = pd.DataFrame({"a":[1,1,2], "b":[2,2,3]})
    out = _apply_remove_duplicates(df)
    assert len(out) == 2

def test_missing_value_fill_constant_and_drop():
    df = pd.DataFrame({"a":[1,None,3], "b":[None,"x","y"]})
    options = [MissingValueOption(strategy="fill_constant", constant_value="X", columns=["b"])]
    out = _apply_missing_value_options(df.copy(), options)
    assert out["b"].iloc[0] == "X"
    options2 = [MissingValueOption(strategy="drop_rows", columns=["a"])]
    out2 = _apply_missing_value_options(df.copy(), options2)
    assert out2.shape[0] == 2