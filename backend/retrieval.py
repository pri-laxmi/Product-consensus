from sqlalchemy import select
from sqlalchemy.orm import Session

from embeddings import generate_embedding
from model import Evidence, Source, ResearchSession, Product