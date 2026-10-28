"""
Motor simbólico-neural: combina recuperação associativa com regras lógicas simples.
"""
class SymbolicMotor:
    def __init__(self, memory):
        self.memory = memory
        self.rules = [
            ("se", "então"),
            ("porque", "logo"),
            ("causa", "efeito"),
        ]

    def infer(self, vec, associations):
        chain = []
        for sim, label in associations:
            chain.append({"label": label, "score": round(sim, 4)})
        return chain
