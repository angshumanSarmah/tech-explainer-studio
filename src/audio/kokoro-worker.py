"""Local, bounded JSON/stdin bridge. No CLI source text, shell or downloads."""
import json
import os
import sys


def main():
    raw = sys.stdin.buffer.read(65537)
    if len(raw) > 65536:
        raise ValueError("job too large")
    job = json.loads(raw)
    required = {"operation", "modelPath", "voicesPath", "voiceId", "rate", "seed", "language", "limits"}
    if not isinstance(job, dict) or set(job) not in (required, required | {"text", "wavPath"}):
        raise ValueError("invalid worker job")
    limits = job["limits"]
    import resource
    resource.setrlimit(resource.RLIMIT_CPU, (limits["cpuSeconds"], limits["cpuSeconds"]))
    resource.setrlimit(resource.RLIMIT_FSIZE, (limits["maxWavBytes"], limits["maxWavBytes"]))
    os.umask(0o077)
    import importlib.metadata
    import platform
    import numpy as np
    import onnxruntime as ort
    ort.disable_telemetry_events()
    # Kokoro graphs contain random operators. Pin their stream before session creation.
    ort.set_seed(job["seed"])
    np.random.seed(job["seed"])
    from kokoro_onnx import Kokoro
    version = importlib.metadata.version("kokoro-onnx")
    if version != "0.6.1":
        return {"ok": False, "code": "RUNTIME_VERSION_MISMATCH", "reason": "Install the exact requirements-audio.lock runtime"}
    identity = {"runtimeVersion": version, "onnxRuntimeVersion": ort.__version__, "pythonVersion": platform.python_version()}
    if job["operation"] == "health":
        voices = []
        if os.path.isfile(job["voicesPath"]):
            with np.load(job["voicesPath"], allow_pickle=False) as bundle:
                voices = sorted(bundle.files)
        return {"ok": True, "operation": "health", **identity, "voices": voices}
    if job["operation"] != "synthesize" or set(job) != required | {"text", "wavPath"}:
        raise ValueError("invalid operation")
    if not isinstance(job["text"], str) or not job["text"].strip() or len(job["text"]) > limits["maxTextChars"]:
        raise ValueError("invalid text length")
    options = ort.SessionOptions()
    options.intra_op_num_threads = limits["threads"]
    options.inter_op_num_threads = 1
    session = ort.InferenceSession(job["modelPath"], sess_options=options, providers=["CPUExecutionProvider"])
    speed_input = next((item for item in session.get_inputs() if item.name == "speed"), None)
    if speed_input and "int" in speed_input.type and not float(job["rate"]).is_integer():
        return {"ok": False, "code": "UNSUPPORTED_RATE", "reason": "This graph requires an integer rate; choose a compatible model/rate"}
    engine = Kokoro.from_session(session, job["voicesPath"])
    if job["voiceId"] not in engine.get_voices():
        return {"ok": False, "code": "VOICE_NOT_FOUND", "reason": "Configured voiceId is absent from the local voice bundle"}
    samples, sample_rate = engine.create(job["text"], voice=job["voiceId"], speed=job["rate"], lang=job["language"])
    samples = np.asarray(samples, dtype=np.float32).reshape(-1)
    if sample_rate != 24000 or samples.size == 0 or not np.all(np.isfinite(samples)) or not np.any(samples):
        return {"ok": False, "code": "INVALID_AUDIO", "reason": "Kokoro returned empty, nonfinite or unsupported audio"}
    if np.max(np.abs(samples)) > 1:
        return {"ok": False, "code": "CLIPPING_AUDIO", "reason": "Synthesized samples exceed PCM range; review the voice/model"}
    if samples.size / sample_rate > limits["maxAudioSeconds"] or samples.size * 2 + 44 > limits["maxWavBytes"]:
        return {"ok": False, "code": "AUDIO_LIMIT", "reason": "Synthesized audio exceeds configured duration/byte limits"}
    import wave
    pcm = np.rint(samples * 32767).astype("<i2")
    with open(job["wavPath"], "xb") as output:
        with wave.open(output, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(sample_rate)
            wav.writeframes(pcm.tobytes())
    return {"ok": True, "operation": "synthesize", **identity, "sampleRate": sample_rate, "samples": int(samples.size)}


try:
    result = main()
except (ImportError, ModuleNotFoundError):
    result = {"ok": False, "code": "DEPENDENCY_MISSING", "reason": "Install requirements-audio.lock into the configured Python environment"}
except Exception:
    # Do not echo source narration or exception excerpts into logs.
    result = {"ok": False, "code": "WORKER_FAILED", "reason": "Local model/voice loading or synthesis failed; verify files, runtime and limits"}
print(json.dumps(result))
