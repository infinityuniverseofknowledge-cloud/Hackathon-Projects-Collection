"""EcoGenesis AI - Python mirror for tests."""
FACTORS = {"electricity_kwh": 0.45, "water_liters": 0.0003, "waste_kg": 0.5, "transport_km": 0.192}

def calc_emissions(inputs):
    by, total = {}, 0.0
    if inputs.get("electricity_kwh") is not None and inputs["electricity_kwh"] >= 0:
        by["electricity"] = inputs["electricity_kwh"] * FACTORS["electricity_kwh"]; total += by["electricity"]
    if inputs.get("water_liters") is not None and inputs["water_liters"] >= 0:
        by["water"] = inputs["water_liters"] * FACTORS["water_liters"]; total += by["water"]
    if inputs.get("waste_kg") is not None and inputs["waste_kg"] >= 0:
        d = inputs.get("waste_diverted_kg") or 0
        lf = max(0.0, inputs["waste_kg"] - d)
        by["waste"] = lf * FACTORS["waste_kg"]; total += by["waste"]
    if inputs.get("transport_km") is not None and inputs["transport_km"] >= 0:
        by["transport"] = inputs["transport_km"] * FACTORS["transport_km"]; total += by["transport"]
    return {"total": total, "by_source": by}

def _clamp(v): return max(0.0, min(100.0, v))

def calc_score(inputs):
    parts, hs = [], inputs.get("household_size") or 1
    if inputs.get("electricity_kwh") is not None and inputs["electricity_kwh"] >= 0:
        pp = inputs["electricity_kwh"] / hs
        parts.append((0.35, _clamp(100 - max(0.0, pp - 150.0) * 0.15)))
    if inputs.get("water_liters") is not None and inputs["water_liters"] >= 0:
        pp = inputs["water_liters"] / hs
        parts.append((0.30, _clamp(100 - max(0.0, pp - 3000.0) * 0.008)))
    if inputs.get("waste_kg") is not None and inputs["waste_kg"] > 0:
        d = (inputs.get("waste_diverted_kg") or 0) / inputs["waste_kg"]
        parts.append((0.35, _clamp(d * 100)))
    if not parts: return {"score": None, "coverage": 0.0, "note": "Insufficient data"}
    tw = sum(w for w, _ in parts); acc = sum(w * v for w, v in parts)
    return {"score": round(acc / tw), "coverage": tw, "note": "Partial data" if tw < 1 else None}

def validate(inputs):
    errs, fields = [], [("electricity_kwh", "Electricity"), ("water_liters", "Water"), ("waste_kg", "Waste"), ("waste_diverted_kg", "Diverted waste"), ("transport_km", "Transport")]
    for k, label in fields:
        v = inputs.get(k)
        if v is None: continue
        if not isinstance(v, (int, float)): errs.append(label + " must be a number"); continue
        if v < 0: errs.append(label + " cannot be negative")
    if (inputs.get("waste_kg") is not None and inputs.get("waste_diverted_kg") is not None and inputs["waste_diverted_kg"] > inputs["waste_kg"]):
        errs.append("Diverted waste cannot exceed total waste")
    hs = inputs.get("household_size", 1)
    if hs < 1 or hs > 20: errs.append("Household size must be 1-20")
    if not any(inputs.get(k) is not None for k, _ in fields) and not errs:
        errs.append("Enter at least one value")
    return errs

def recommend(inputs, score_result):
    recs, hs = [], inputs.get("household_size") or 1
    epp = (inputs.get("electricity_kwh") or 0) / hs
    wpp = (inputs.get("water_liters") or 0) / hs
    w = inputs.get("waste_kg") or 0
    d = inputs.get("waste_diverted_kg") or 0
    div = (d / w) if w > 0 else None
    if epp > 200: recs.append({"id": "led", "priority": "high"})
    if wpp > 4000: recs.append({"id": "leaks", "priority": "high"})
    if div is not None and div < 0.30: recs.append({"id": "separation", "priority": "high"})
    if div is not None and div < 0.50: recs.append({"id": "compost", "priority": "medium"})
    if (inputs.get("transport_km") or 0) > 500: recs.append({"id": "transport", "priority": "medium"})
    if not recs: recs.append({"id": "maintain", "priority": "low"})
    return recs
