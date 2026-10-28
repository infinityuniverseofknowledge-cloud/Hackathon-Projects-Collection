import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from logic import calc_emissions, calc_score, validate, recommend

def test_electricity(): assert abs(calc_emissions({"electricity_kwh": 100.0})["by_source"]["electricity"] - 45.0) < 1e-9
def test_water(): assert abs(calc_emissions({"water_liters": 10000.0})["by_source"]["water"] - 3.0) < 1e-9
def test_waste(): assert abs(calc_emissions({"waste_kg": 100.0, "waste_diverted_kg": 60.0})["by_source"]["waste"] - 20.0) < 1e-9
def test_transport(): assert abs(calc_emissions({"transport_km": 1000.0})["by_source"]["transport"] - 192.0) < 1e-9
def test_total(): assert abs(calc_emissions({"electricity_kwh": 100.0, "water_liters": 10000.0, "waste_kg": 100.0, "waste_diverted_kg": 60.0, "transport_km": 1000.0})["total"] - 260.0) < 1e-6
def test_zero(): assert calc_emissions({"electricity_kwh": 0, "water_liters": 0, "waste_kg": 0, "transport_km": 0})["total"] == 0.0
def test_score_low(): assert calc_score({"electricity_kwh": 30.0, "household_size": 1})["score"] >= 90
def test_score_high(): assert calc_score({"electricity_kwh": 2000.0, "household_size": 1})["score"] <= 20
def test_score_bounds(): assert 0 <= calc_score({"electricity_kwh": 10000.0, "water_liters": 100000.0, "waste_kg": 500.0, "waste_diverted_kg": 0.0, "household_size": 1})["score"] <= 100
def test_score_empty(): assert calc_score({"household_size": 2})["score"] is None
def test_score_partial(): assert abs(calc_score({"electricity_kwh": 100.0, "household_size": 1})["coverage"] - 0.35) < 1e-9
def test_valid(): assert validate({"electricity_kwh": 100, "water_liters": 5000, "waste_kg": 20, "waste_diverted_kg": 10, "transport_km": 500, "household_size": 3}) == []
def test_negative(): assert any("negative" in e for e in validate({"electricity_kwh": -50}))
def test_non_numeric(): assert any("number" in e for e in validate({"electricity_kwh": "abc"}))
def test_diverted_exceeds(): assert any("Diverted" in e for e in validate({"waste_kg": 20, "waste_diverted_kg": 30}))
def test_household_range(): assert validate({"household_size": 0}) != [] and validate({"household_size": 25}) != []
def test_no_data(): assert any("at least one" in e for e in validate({"household_size": 1}))
def test_led(): assert "led" in [r["id"] for r in recommend({"electricity_kwh": 900, "household_size": 1}, calc_score({"electricity_kwh": 900, "household_size": 1}))]
def test_leaks(): assert "leaks" in [r["id"] for r in recommend({"water_liters": 20000, "household_size": 1}, calc_score({"water_liters": 20000, "household_size": 1}))]
def test_no_leaks(): assert "leaks" not in [r["id"] for r in recommend({"water_liters": 1000, "household_size": 1}, calc_score({"water_liters": 1000, "household_size": 1}))]
def test_separation(): assert "separation" in [r["id"] for r in recommend({"waste_kg": 100, "waste_diverted_kg": 10, "household_size": 1}, calc_score({"waste_kg": 100, "waste_diverted_kg": 10, "household_size": 1}))]
def test_fallback(): assert len(recommend({"household_size": 1}, calc_score({"household_size": 1}))) >= 1
