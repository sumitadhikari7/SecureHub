CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    status VARCHAR(50) DEFAULT 'active',
    suspended_until TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admins (
    admin_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auctions (
    auction_id SERIAL PRIMARY KEY,
    seller_id INT NOT NULL,
    winner_id INT NULL, 
    title VARCHAR(255) NOT NULL,
    description TEXT,
    starting_price NUMERIC(12, 2) NOT NULL CHECK (starting_price >= 0),
    current_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'upcoming', -- upcoming, active, closed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_auction_seller FOREIGN KEY (seller_id) REFERENCES users(user_id) ON DELETE RESTRICT,
    CONSTRAINT fk_auction_winner FOREIGN KEY (winner_id) REFERENCES users(user_id) ON DELETE SET NULL
);