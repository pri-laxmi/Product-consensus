
from embeddings import generate_embedding

text = "The headphones are comfortable for long listening sessions."

vector = generate_embedding(text)

print("Embedding dimensions:", len(vector))
print("First 5 values:", vector[:5])
print("Vector generated successfully:", len(vector) == 384)
