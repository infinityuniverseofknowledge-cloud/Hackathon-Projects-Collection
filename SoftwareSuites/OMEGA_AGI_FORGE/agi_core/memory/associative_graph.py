"""
Grafo associativo dinâmico — Hebbian puro.
'Neurônios que disparam juntos, conectam-se juntos.'
"""
import numpy as np
from collections import defaultdict

class AssociativeGraph:
    def __init__(self, dim):
        self.dim = dim
        self.nodes = {}         # id -> vetor
        self.edges = defaultdict(float)  # (id_a, id_b) -> peso
        self._next_id = 0

    def store(self, label, vec):
        nid = self._next_id
        self._next_id += 1
        self.nodes[nid] = {"label": label, "vec": vec}
        return nid

    def reinforce(self, va, vb, lr=0.05):
        # Hebb: Δw = lr * (a · b)
        w = float(np.dot(va, vb))
        key = (self._hash(va), self._hash(vb))
        self.edges[key] += lr * w

    def recall(self, query, k=5):
        scores = []
        for nid, node in self.nodes.items():
            sim = float(np.dot(query, node["vec"]))
            scores.append((sim, node["label"]))
        scores.sort(reverse=True, key=lambda x: x[0])
        return scores[:k]

    @staticmethod
    def _hash(v):
        return int(abs(np.sum(v * 1e6))) % 10**9
