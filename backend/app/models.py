import os
import threading
from typing import Optional

from transformers import AutoModelForCausalLM, AutoTokenizer, pipeline
import torch

_model_lock = threading.Lock()
_text_generation_pipe = None


def get_model_id() -> str:
	return os.getenv("MODEL_ID", "meta-llama/Llama-3.1-8B-Instruct")


def _load_text_generation_pipeline():
	global _text_generation_pipe
	if _text_generation_pipe is not None:
		return _text_generation_pipe
	with _model_lock:
		if _text_generation_pipe is not None:
			return _text_generation_pipe
		model_id = get_model_id()
		hf_token = os.getenv("HUGGINGFACE_HUB_TOKEN")
		try:
			tokenizer = AutoTokenizer.from_pretrained(model_id, use_auth_token=hf_token)
			model = AutoModelForCausalLM.from_pretrained(
				model_id,
				torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32,
				device_map="auto",
				use_auth_token=hf_token,
			)
			_text_generation_pipe = pipeline(
				"text-generation",
				model=model,
				tokenizer=tokenizer,
				max_new_tokens=512,
				temperature=0.2,
				top_p=0.9,
			)
			return _text_generation_pipe
		except Exception:
			# Fallback to a small open model for CPU environments
			fallback_id = os.getenv("FALLBACK_MODEL_ID", "distilgpt2")
			tokenizer = AutoTokenizer.from_pretrained(fallback_id)
			model = AutoModelForCausalLM.from_pretrained(fallback_id)
			_text_generation_pipe = pipeline(
				"text-generation", model=model, tokenizer=tokenizer, max_new_tokens=256
			)
			return _text_generation_pipe


def get_text_generation_pipeline():
	return _load_text_generation_pipeline()


def generate_with_system_prompt(system_prompt: str, user_prompt: str) -> str:
	pipe = get_text_generation_pipeline()
	full_prompt = f"<|system|>\n{system_prompt}\n<|user|>\n{user_prompt}\n<|assistant|>\n"
	outputs = pipe(full_prompt)
	text = outputs[0]["generated_text"]
	# Try to split at assistant tag if present
	if "<|assistant|>" in text:
		text = text.split("<|assistant|>", 1)[-1]
	return text.strip()

