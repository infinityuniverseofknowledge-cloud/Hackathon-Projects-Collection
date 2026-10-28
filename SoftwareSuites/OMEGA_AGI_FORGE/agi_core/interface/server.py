"""
Servidor Flask + WebSocket: serve interface HTML e conecta ao AGIEngine.
"""
from flask import Flask, render_template, request, jsonify
from core.engine import AGIEngine

app = Flask(__name__, template_folder=".")
agi = AGIEngine()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/think", methods=["POST"])
def think():
    data = request.get_json()
    text = data.get("input", "")
    result = agi.step(text)
    return jsonify(result)

@app.route("/api/learn", methods=["POST"])
def learn():
    data = request.get_json()
    loss = agi.learn(data["input"], data["target"])
    return jsonify({"loss": loss})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
