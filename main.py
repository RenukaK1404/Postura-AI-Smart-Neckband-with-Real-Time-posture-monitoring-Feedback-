"""
Strict domain-limited chatbot server for the Postura project.
ONLY answers questions related to:
- neck pain
- shoulder pain
- back pain
- posture & slouching

Anything else is BLOCKED.
"""

import os
import json
import random
import re
from flask import Flask, request, jsonify

# ---------------- CONFIG ---------------- #

USE_LLM = os.environ.get("USE_LLM", "0") == "1"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")

ALLOWED_TOPICS = [
    "neck", "neck pain", "stiff neck",
    "shoulder", "shoulder pain",
    "back", "upper back", "mid back",
    "posture", "slouch", "forward head",
    "pain", "stiffness"
]

IRRELEVANT_RESPONSE = (
    "I can only help with neck, shoulder, back, and posture-related issues."
)

# ---------------------------------------- #

openai = None
if USE_LLM and OPENAI_API_KEY:
    try:
        import openai
        openai.api_key = OPENAI_API_KEY
    except Exception:
        USE_LLM = False

APP_ROOT = os.path.dirname(os.path.abspath(__file__))
RESPONSES_PATH = os.path.join(APP_ROOT, "response.json")

with open(RESPONSES_PATH, "r", encoding="utf-8") as f:
    RESPONSES = json.load(f)

app = Flask(__name__)

# Compile intent patterns
for intent in RESPONSES.get("intents", []):
    intent["_patterns_re"] = [
        re.compile(rf"\b{re.escape(p)}\b", re.I)
        for p in intent.get("patterns", [])
    ]


# ---------------- UTILITIES ---------------- #

def is_domain_query(message: str) -> bool:
    msg = message.lower()
    return any(topic in msg for topic in ALLOWED_TOPICS)


def find_intent_rule(message: str):
    for intent in RESPONSES.get("intents", []):
        for pat in intent.get("_patterns_re", []):
            if pat.search(message):
                return intent
    return None


def pick_response(intent):
    if not intent:
        return IRRELEVANT_RESPONSE
    return random.choice(intent.get("responses", []))


# ---------------- ROUTES ---------------- #

@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json(force=True)
    message = (data.get("message") or "").strip()

    if not message:
        return jsonify({"error": "empty message"}), 400

    # 🚫 HARD DOMAIN BLOCK (THIS FIXES YOUR ISSUE)
    if not is_domain_query(message):
        return jsonify({
            "intent": "irrelevant",
            "response": IRRELEVANT_RESPONSE,
            "source": "domain-filter"
        })

    # Rule-based intent
    intent = find_intent_rule(message)
    rule_response = pick_response(intent)

    # Optional LLM (still restricted)
    if USE_LLM and openai:
        try:
            completion = openai.ChatCompletion.create(
                model="gpt-3.5-turbo",
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a posture assistant. "
                            "ONLY answer questions about neck, shoulder, back pain and posture. "
                            "If not related, reply: 'I can only help with posture-related issues.'"
                        )
                    },
                    {"role": "user", "content": message}
                ],
                max_tokens=150,
                temperature=0.2,
            )

            llm_text = completion["choices"][0]["message"]["content"].strip()

            if is_domain_query(llm_text):
                return jsonify({
                    "intent": "llm",
                    "response": llm_text,
                    "source": "llm"
                })

        except Exception:
            pass

    return jsonify({
        "intent": intent.get("name") if intent else "fallback",
        "response": rule_response,
        "source": "rule"
    })


# ---------------- RUN ---------------- #

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)w