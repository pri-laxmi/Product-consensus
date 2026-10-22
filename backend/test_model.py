from database import Base, engine
import model

Base.metadata.create_all(bind=engine)

print("Tables created successfully:")
for table_name in Base.metadata.tables:
    print("-", table_name)