from fastapi.testclient import TestClient
from app.main import app
import io

client = TestClient(app)


def test_full_dataset_flow():
    # --------------------------- Create session ------------------------
    res = client.post("/session")
    session_id = res.json()["session_id"]

    # --------------------------- Upload -------------------------------
    file_content = b"col1,col2\nval1,val2\nx,y\n1,2\n3,4\n5,6\nextra,row"
    files = {"file": ("test.csv", io.BytesIO(file_content), "text/csv")}
    data = {"session_id": session_id}

    res = client.post("/datasets/upload", files=files, data=data)
    assert res.status_code == 200
    dataset_id = res.json()["dataset_id"]

    # --------------------------- Preview ------------------------------
    res = client.get(f"/datasets/{dataset_id}/preview?session_id={session_id}")
    assert res.status_code == 200
    assert len(res.json()["preview"]) == 5

    # --------------------------- Info ---------------------------------
    res = client.get(f"/datasets/{dataset_id}/info?session_id={session_id}")
    assert res.status_code == 200
    assert res.json()["dataset_id"] == dataset_id

    # --------------------------- Status -------------------------------
    res = client.get(f"/datasets/{dataset_id}/status?session_id={session_id}")
    assert res.status_code == 200
    assert res.json()["status"] == "Uploaded"

    # --------------------------- Download -----------------------------
    res = client.get(f"/datasets/{dataset_id}/download?session_id={session_id}")
    assert res.status_code == 200
    assert b"col1" in res.content

    # --------------------------- Get dataset --------------------------
    res = client.get(f"/datasets/{dataset_id}?session_id={session_id}")
    assert res.status_code == 200

    # --------------------------- Delete -------------------------------
    res = client.delete(f"/datasets/{dataset_id}?session_id={session_id}")
    assert res.status_code == 200