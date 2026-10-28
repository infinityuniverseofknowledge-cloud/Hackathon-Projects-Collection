"""
Codificador multimodal: transforma texto (e futuramente áudio/imagem)
em vetores densos via hashing semântico + projeção.
"""
import numpy as np
import hashlib

class MultiModalEncoder:
    def __init__(self, dim=128):
        self.dim = dim
        np.random.seed(42)
        self.proj = np.random.randn(dim, dim) * 0.1

    def _hash_embed(self, token):
        h = int(hashlib.sha256(token.encode()).hexdigest(), 16)
        np.random.seed(h % (2**32))
        return np.random.randn(self.dim)

    def encode(self, text: str) -> np.ndarray:
        tokens = text.lower().split()
        if not tokens:
            return np.zeros(self.dim)
        vecs = np.array([self._hash_embed(t) for t in tokens])
        mean = vecs.mean(axis=0)
        out = np.tanh(mean @ self.proj)
        return out / (np.linalg.norm(out) + 1e-9)
