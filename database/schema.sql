CREATE TABLE IF NOT EXISTS user (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(20),
    status VARCHAR(50) DEFAULT 'active',
    suspended_until TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin (
    admin_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auction (
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
    -- ON DELETE RESTRICT means if a seller tries to completely delete their account while they have an active auction listing, PostgreSQL blocks the deletion to protect the platform.
    CONSTRAINT fk_auction_winner FOREIGN KEY (winner_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS bid (
    bid_id SERIAL PRIMARY KEY,
    auction_id INT NOT NULL,
    bidder_id INT NOT NULL,
    bid_amount NUMERIC(12, 2) NOT NULL CHECK (bid_amount > 0),
    bid_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_bid_auction FOREIGN KEY (auction_id) REFERENCES auctions(auction_id) ON DELETE CASCADE,
    -- ON DELETE CASCADE: If an admin completely deletes a product auction from the system, this rule automatically deletes every single bid associated with that auction instantly, avoiding broken records in your database.
    CONSTRAINT fk_bid_bidder FOREIGN KEY (bidder_id) REFERENCES users(user_id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS fraud_alert (
    alert_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,          -- Flagged suspect user
    auction_id INT NOT NULL,       -- Contextual auction target
    risk_score NUMERIC(5, 2) NOT NULL, -- ML prediction score mapping output
    prediction VARCHAR(100),       -- Classification details (e.g., 'Shill Bidding')
    alert_status VARCHAR(50) DEFAULT 'pending', -- pending, investigated, dismissed
    reviewed_by INT NULL,          -- Admin who checked it
    reviewed_at TIMESTAMP WITH TIME ZONE NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alert_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_alert_auction FOREIGN KEY (auction_id) REFERENCES auctions(auction_id) ON DELETE CASCADE,
    CONSTRAINT fk_alert_admin FOREIGN KEY (reviewed_by) REFERENCES admins(admin_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admin_action (
    action_id SERIAL PRIMARY KEY,
    admin_id INT NOT NULL,
    user_id INT NOT NULL,
    alert_id INT NULL, 
    action_type VARCHAR(100) NOT NULL, --  'Suspension', 'Auction Cancellation'
    reason TEXT NOT NULL,
    duration_days INT NULL,
    action_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_action_admin FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE RESTRICT, 
    CONSTRAINT fk_action_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CONSTRAINT fk_action_alert FOREIGN KEY (alert_id) REFERENCES fraud_alerts(alert_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON user(email);
CREATE INDEX IF NOT EXISTS idx_auctions_seller ON auction(seller_id);
CREATE INDEX IF NOT EXISTS idx_bids_auction_amount ON bid(auction_id, bid_amount DESC);
CREATE INDEX IF NOT EXISTS idx_fraud_alerts_status ON fraud_alert(alert_status);