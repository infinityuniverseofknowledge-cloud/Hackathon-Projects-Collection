"""
Ponto de entrada — CLI interativo para conversar com a AGI.
"""
from core.engine import AGIEngine

if __name__ == "__main__":
    agi = AGIEngine()
    print("🧠 AGI pronta. Digite 'sair' para encerrar.")
    while True:
        try:
            txt = input("você > ").strip()
            if txt.lower() in ("sair", "exit", "quit"): break
            result = agi.step(txt)
            print(f"agi  > {result['thoughts'][:3]}")
        except KeyboardInterrupt:
            break
