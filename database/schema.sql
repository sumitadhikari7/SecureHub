CREATE TABLE IF NOT EXISTS producers (
    producer_id SERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50),
    district VARCHAR(100),
    cooperative VARCHAR(150),
    citizenship_no VARCHAR(50) UNIQUE,
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
