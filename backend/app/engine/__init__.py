"""
The NEXUS detection engine.

Today every stage is *simulated*: a deterministic generator stands in for packet
capture, feature extraction, the classifier, the anomaly detector and SHAP.
Each stage lives in its own module so real implementations (Scapy, XGBoost,
Isolation Forest, SHAP, an LLM) can replace them behind the same service API.
See docs/SIMULATED_DATASET.md for the simulated environment.
"""
