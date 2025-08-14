from transformers import pipeline

qa_pipeline = pipeline("question-answering", model="distilbert-base-cased-distilled-squad")

def answer_question(question, context, max_chunk_length=400):
    paragraphs = context.split("\n")
    best_answer = None
    best_score = 0

    for para in paragraphs:
        if len(para.strip()) < 20:  # skip tiny chunks
            continue
        try:
            result = qa_pipeline(question=question, context=para[:max_chunk_length])
            if result["score"] > best_score:
                best_answer = result["answer"]
                best_score = result["score"]
        except Exception:
            continue

    answer_text = best_answer if best_answer else "No relevant answer found."

    # Return object matching front-end expectations
    return {
        "answer": answer_text,
        "source": "local context",   # or URL if you have one
        "trust_score": best_score    # a float between 0 and 1
    }
