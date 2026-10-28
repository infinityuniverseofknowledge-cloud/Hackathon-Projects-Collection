"""
=========================================================
  AHA-Net — Adaptive Hebbian Attention Network
  Algoritmo inovador que combina:
   1. Atenção multi-cabeça esparsa (inspirada em transformers)
   2. Atualização Hebbiana local (bio-plausível)
   3. Backprop esparso por relevância (Sparse-BP)
=========================================================
"""
import numpy as np

class AHANet:
    def __init__(self, input_dim=128, hidden=256, output=128, heads=4, lr=1e-3):
        self.dim_in, self.hid, self.dim_out = input_dim, hidden, output
        self.heads = heads
        self.lr = lr

        # Pesos (Xavier)
        self.Wq = np.random.randn(heads, input_dim, hidden // heads) * np.sqrt(2.0/input_dim)
        self.Wk = np.random.randn(heads, input_dim, hidden // heads) * np.sqrt(2.0/input_dim)
        self.Wv = np.random.randn(heads, input_dim, hidden // heads) * np.sqrt(2.0/input_dim)
        self.Wo = np.random.randn(hidden, output) * np.sqrt(2.0/hidden)

        # Traços Hebbianos (memória de curto prazo dos pesos)
        self.hebb_trace = np.zeros_like(self.Wo)

    def _softmax(self, x, axis=-1):
        e = np.exp(x - x.max(axis=axis, keepdims=True))
        return e / (e.sum(axis=axis, keepdims=True) + 1e-9)

    def forward(self, x):
        # x: (dim_in,)
        Q = np.einsum('i,hij->hj', x, self.Wq)  # (heads, d_k)
        K = np.einsum('i,hij->hj', x, self.Wk)
        V = np.einsum('i,hij->hj', x, self.Wv)

        # Atenção esparsa: mantém apenas top-2 scores por cabeça
        scores = Q * K  # (heads, d_k)
        thresh = np.partition(scores, -2, axis=-1)[..., -2][..., None]
        mask = (scores >= thresh).astype(float)
        attn = scores * mask

        H = (attn * V).reshape(-1)  # (hidden,)
        H = np.tanh(H)
        out = H @ self.Wo
        return out, H

    def train_step(self, x, target):
        out, H = self.forward(x)
        err = out - target
        loss = float(np.mean(err ** 2))

        # Backprop esparso: só atualiza pesos com H > média
        mask = (np.abs(H) > np.mean(np.abs(H))).astype(float)
        grad_Wo = np.outer(H * mask, err)

        # Atualização dupla: gradiente + traço Hebbiano
        hebb_update = np.outer(H, target) * 0.01
        self.hebb_trace = 0.9 * self.hebb_trace + 0.1 * hebb_update

        self.Wo -= self.lr * (grad_Wo + self.hebb_trace * 0.1)
        return loss

    def save(self, path):
        np.savez(path, Wq=self.Wq, Wk=self.Wk, Wv=self.Wv, Wo=self.Wo)

    def load(self, path):
        d = np.load(path)
        self.Wq, self.Wk, self.Wv, self.Wo = d["Wq"], d["Wk"], d["Wv"], d["Wo"]
