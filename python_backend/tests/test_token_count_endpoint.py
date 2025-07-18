def test_token_count_endpoint(client):
    resp = client.post("/api/tokenCount", json={"text": "lorem ipsum"})
    assert resp.status_code == 200
    assert resp.json["data"]["tokenCount"] > 0

    # missing text
    bad = client.post("/api/tokenCount", json={})
    assert bad.status_code == 400
