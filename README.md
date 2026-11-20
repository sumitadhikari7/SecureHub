# SecureHub: Secure Online Auction System with Fraud Detection

SecureHub is a secure online auction platform designed to provide a reliable and transparent bidding environment. The system allows users to participate in online auctions, place bids in real time, and manage their auction activities.

The platform integrates a **Machine Learning-based Fraud Detection System** that analyzes bidder behavior and identifies potentially suspicious bidding patterns, helping administrators monitor and review fraudulent activities.

## Key Features

### User Management
- User registration and authentication.
- Secure login and session management.
- User account and balance management.
- Role-based access for administrators and regular users.

### Online Auction Management
- Create and manage auctions.
- Browse available auctions.
- View auction details and current prices.
- Place bids on active auctions.
- Track bidding activities.
- Real-time auction updates.

### Machine Learning-Based Fraud Detection
- Logistic Regression-based fraud scoring.
- Analyzes nine behavioral features to identify suspicious bidding activities.
- Detects potentially suspicious patterns, including:
  - Bidder Tendency
  - Bidding Ratio
  - Successive Outbidding
  - Last Bidding
  - Auction Bids
  - Starting Price Average
  - Early Bidding
  - Winning Ratio
  - Auction Duration
- Sliding-window analysis of recent outbidding events.
- Rapid bidding detection (15-second response window).
- Unusual price escalation detection:
  - 2× price increase: 0.30 penalty.
  - 3× or greater price increase: 0.70 penalty.
- Generates a risk score for each bidder after a successful bid.
- Automatically creates fraud alerts when the risk score reaches the configured threshold (0.5).

### Admin Dashboard
- Monitor users and auctions.
- View machine-learning-generated fraud alerts.
- Review suspicious bidding activities.
- Monitor risk scores and fraud predictions.
- Track alert review status.
- Manage administrative activities.

### Real-Time Notifications
- Real-time auction updates using Socket.IO.
- Instant communication of relevant auction events.
- Fraud alert notifications for administrators.

### Additional Security Features
- OTP-based verification using Redis.
- Email notifications using Nodemailer.
- PostgreSQL database integration.
- Server-side validation and authentication.

---

## Technology Stack

| Technology | Purpose |
|---|---|
| React.js | Frontend development |
| Vite | Frontend build tool |
| Node.js | Backend runtime |
| Express.js | Backend framework |
| PostgreSQL | Relational database |
| Redis | OTP storage and management |
| Socket.IO | Real-time communication |
| Nodemailer | Email notifications |
| JavaScript | Backend and ML inference |

---

## Machine Learning – Fraud Detection

SecureHub integrates a Logistic Regression model to calculate the likelihood of suspicious bidding behavior.

### Model Workflow

1. A user places a bid.
2. The backend retrieves relevant auction and bidder information.
3. Nine behavioral features are calculated.
4. Feature values are standardized using the trained model's scaling parameters.
5. The Logistic Regression model calculates a risk score using the sigmoid activation function.
6. The risk score is compared against the configured threshold.
7. If the score is greater than or equal to 0.5, a fraud alert is generated.
8. The alert is stored in PostgreSQL for administrative review.

### Fraud Detection Formula

The model uses Logistic Regression:

**Sigmoid Function:**

\[
P(y=1)=\frac{1}{1+e^{-z}}
\]

Where:

\[
z=b+\sum_{i=1}^{n}w_i x_i
\]

Here:
- \(b\) = Model intercept
- \(w_i\) = Trained model coefficients
- \(x_i\) = Standardized feature values

### Fraud Alert Classification

| Risk Score | System Action |
|---|---|
| Below 0.5 | No fraud alert generated |
| 0.5 or above | Fraud alert generated for admin review |

**Note:** The risk score is a model output, not proof of fraudulent activity. Administrators are responsible for reviewing generated alerts.

---

## Database

SecureHub uses PostgreSQL to store application data.

Major database entities include:

- `users` – Stores user account information.
- `auctions` – Stores auction details and pricing information.
- `bids` – Stores bidding activities.
- `fraud_alerts` – Stores machine-learning-generated fraud alerts and administrative review information.

### Fraud Alerts Table

| Column | Description |
|---|---|
| `alert_id` | Unique alert identifier |
| `user_id` | ID of the flagged bidder |
| `auction_id` | Associated auction |
| `risk_score` | ML-generated risk score |
| `prediction` | Fraud prediction |
| `alert_status` | Current review status |
| `reviewed_by` | Administrator who reviewed the alert |
| `reviewed_at` | Date and time of review |
| `created_at` | Alert creation timestamp |

---

## Project Structure

```text
SecureHub/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── assets/
│   │   └── ...
│   ├── public/
│   ├── package.json
│   └── ...
│
├── backend/
│   ├── server.js
│   ├── fraudDetection.js
│   ├── package.json
│   └── ...
│
└── README.md


## Installation and Setup

### Prerequisites

Make sure you have installed:

- Node.js
- npm
- PostgreSQL
- Redis

### 1. Clone the Repository

```bash
git clone YOUR_REPOSITORY_URL
cd SecureHub
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Configure your backend environment variables in a `.env` file.

Example configuration:

```env
PORT=5000

DATABASE_URL=your_postgresql_connection_string

REDIS_URL=your_redis_connection_string

SESSION_SECRET=your_session_secret

EMAIL_USER=your_email_address
EMAIL_PASS=your_email_app_password
```

Use the exact environment variable names expected by your backend code.

Start the backend:

```bash
node server.js
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

### 4. Database Configuration

- Create a PostgreSQL database.
- Execute the project's database schema and SQL setup scripts.
- Configure the database connection.
- Ensure PostgreSQL and Redis are running before starting the application.

---

## 🔄 System Workflow

```text
          USER
            |
            v
      User Authentication
            |
            v
       Browse Auctions
            |
            v
         Place Bid
            |
            v
      Save Bid in Database
            |
            v
     Extract Bidder Features
            |
            v
      Logistic Regression
            |
            v
       Calculate Risk Score
            |
            v
      Compare with 0.5
            |
       +----+----+
       |         |
     Below     >= 0.5
      0.5        |
       |         v
       |    Generate Alert
       |         |
       |         v
       |    Store in Database
       |         |
       |         v
       |    Admin Dashboard
       |         |
       |         v
       |    Admin Review
       |
       v
  Continue Normal Bidding
```

---

## Future Enhancements

- Improve fraud detection accuracy through additional training data.
- Evaluate the model using precision, recall, F1-score, and confusion matrix.
- Introduce more advanced behavioral analysis.
- Implement automatic suspicious account monitoring.
- Improve fraud alert explanations and reporting.
- Introduce enhanced security and access-control mechanisms.
- Add detailed analytics and visualization to the admin dashboard.

---

## Project Objective

The primary objective of SecureHub is to develop a secure and user-friendly online auction platform while integrating machine learning techniques to identify potentially fraudulent bidding behavior.

By combining real-time auction functionality, secure authentication, and automated fraud-risk analysis, SecureHub aims to improve transparency, monitoring, and trust in online auction activities.

---

## 👨‍💻 Project Information

**Project Name:** SecureHub

**Project Type:** Academic Project

**Project Title:** Secure Online Auction System with Fraud Detection

**Technologies:** React.js, Vite, Node.js, Express.js, PostgreSQL, Redis, Socket.IO, and Machine Learning.