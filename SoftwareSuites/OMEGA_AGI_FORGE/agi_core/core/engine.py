"""
Motor central da AGI. Orquestra percepção, memória, raciocínio e aprendizado.
"""
import numpy as np
from learning.aha_net import AHANet
from memory.associative_graph import AssociativeGraph
from perception.encoder import MultiModalEncoder
from reasoning.symbolic_motor import SymbolicMotor

class AGIEngine:
    def __init__(self, dim=128):
        self.dim = dim
        self.encoder = MultiModalEncoder(dim)
        self.memory = AssociativeGraph(dim)
        self.reasoner = SymbolicMotor(self.memory)
        self.brain = AHANet(input_dim=dim, hidden=256, output=dim)

    def perceive(self, raw_input: str):
        vec = self.encoder.encode(raw_input)
        self.memory.store(raw_input, vec)
        return vec

    def think(self, vec):
        associations = self.memory.recall(vec, k=5)
        return self.reasoner.infer(vec, associations)

    def learn(self, inp, target):
        v_in = self.encoder.encode(inp)
        v_tg = self.encoder.encode(target)
        loss = self.brain.train_step(v_in, v_tg)
        self.memory.reinforce(v_in, v_tg)
        return loss

    def step(self, user_input: str):
        v = self.perceive(user_input)
        thought = self.think(v)
        return {"input": user_input, "vector_norm": float(np.linalg.norm(v)),
                "thoughts": thought}
