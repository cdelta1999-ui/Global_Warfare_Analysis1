import pytest
from fastapi.testclient import TestClient
from server import app

client = TestClient(app)

def test_map_data():
    response = client.get("/api/map_data")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert isinstance(data["data"], list)
    if len(data["data"]) > 0:
        item = data["data"][0]
        assert "Country" in item
        assert "WVI" in item

def test_intelligence_endpoint():
    response = client.get("/api/intelligence/India")
    assert response.status_code == 200
    data = response.json()
    assert "country" in data
    assert data["country"] == "India"
    assert "pillars" in data
    assert "kinetic" in data["pillars"]
    assert "cyber" in data["pillars"]
    assert "economic" in data["pillars"]

def test_forecast_endpoint():
    response = client.get("/api/forecast/India")
    assert response.status_code == 200
    data = response.json()
    assert "forecast" in data
    assert "timeline" in data
    assert "war_type_probabilities" in data

def test_flow_maps():
    response = client.get("/api/flow_maps")
    assert response.status_code == 200

def test_pipeline_status():
    response = client.get("/api/pipeline/status")
    assert response.status_code == 200
    data = response.json()
    assert "sources" in data
