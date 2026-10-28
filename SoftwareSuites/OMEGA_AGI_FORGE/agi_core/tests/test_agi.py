from core.engine import AGIEngine

def test_cycle():
    agi = AGIEngine()
    r = agi.step("o que é consciência?")
    assert "thoughts" in r
    loss = agi.learn("sol", "estrela")
    assert loss >= 0

if __name__ == "__main__":
    test_cycle()
    print("✅ Testes passaram")
