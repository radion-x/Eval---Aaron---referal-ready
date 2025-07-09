# Spine IQ Assessment Tool

Spine IQ is a comprehensive web application designed to streamline the patient assessment process for spinal conditions. It features a detailed, multi-step patient intake form, a secure dashboard for doctors to review patient data, and leverages AI to generate clinical summaries.

## Features

- **Patient Assessment Form:** A user-friendly, multi-step form for patients to provide their medical history, symptoms, and other relevant information.
- **Doctor Dashboard:** A secure, password-protected dashboard for clinicians to view and manage patient assessments.
- **AI-Powered Summaries:** Integration with the Anthropic (Claude) API to automatically generate concise clinical summaries from patient data.
- **File Uploads:** Patients can upload relevant medical documents, such as imaging reports.
- **Email Notifications:** Automated email notifications to both the patient and the clinic upon form submission.
- **Dark Mode:** A theme toggle for user preference.

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express.js
- **Database:** MongoDB
- **AI:** Anthropic (Claude) API
- **Email:** Nodemailer with Mailgun

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js and npm
- MongoDB

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    ```
2.  **Install server dependencies:**
    ```bash
    cd server
    npm install
    ```
3.  **Install client dependencies:**
    ```bash
    cd ../client
    npm install
    ```

### Configuration

#### Server Configuration

1.  Navigate to the `server` directory.
2.  Create a `.env` file by copying the example file:
    ```bash
    cp .env.example .env
    ```
3.  Open the `.env` file and fill in the required environment variables:
    - `SERVER_PORT`: The port for the backend server. **This must match the port in `client/vite.config.ts`**.
    - `CLAUDE_API_KEY`: Your API key for the Anthropic (Claude) API.
    - `MONGODB_URI`: The connection string for your MongoDB database.
    - `MAILGUN_SMTP_SERVER`, `MAILGUN_SMTP_PORT`, `MAILGUN_SMTP_LOGIN`, `MAILGUN_SMTP_PASSWORD`: Your Mailgun SMTP credentials.
    - `EMAIL_SENDER_ADDRESS`, `EMAIL_RECIPIENT_ADDRESS`, `BCC_EMAIL_RECIPIENT_ADDRESS`: Email addresses for sending and receiving notifications.
    - `DASHBOARD_PASSWORD`: The password for the doctor dashboard.
    - `SESSION_SECRET`: A secret key for express-session.
    - `SERVER_BASE_URL`: The public-facing URL of your backend server. For local development, this should be `http://localhost:<your-server-port>`.

#### Client Configuration

1.  **Development:**
    - In the `client` directory, the `.env.development` file should have `VITE_SERVER_BASE_URL` set to the URL of your local backend server (e.g., `http://localhost:3797`).

2.  **Production:**
    - Before building the client for production, you must update the `.env.production` file.
    - Set `VITE_SERVER_BASE_URL` to the live, public-facing URL of your deployed backend server (e.g., `https://api.yourapp.com`).

### Running the Application

1.  **Start the server:**
    ```bash
    cd server
    npm start
    ```
2.  **Start the client:**
    ```bash
    cd ../client
    npm run dev
    ```

The application should now be running on your local machine.
