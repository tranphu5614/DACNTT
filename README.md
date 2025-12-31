# IT Helpdesk AI Assistant & Internal Request System

## Introduction

This is a comprehensive **Internal Request System** integrated with a powerful **IT Helpdesk AI Assistant** powered by Google Gemini.

The project is designed to automate technical support processes, reduce the workload for IT staff, and optimize enterprise workflows through automatic priority classification and intelligent solution suggestions.

## Key Features

### AI & Automation (Powered by Google Gemini)
* **Auto Priority Classification:** The system analyzes request content and automatically tags the priority level: `LOW`, `MEDIUM`, `HIGH`, or `URGENT`.
* **Smart Auto-Reply:** Instantly suggests quick fixes for common issues (e.g., "reset password", "check cable"), allowing users to resolve problems without waiting for an agent.
* **Model Auto-Discovery:** Automatically selects the best available Gemini model (prioritizing `gemini-1.5-flash` for speed and high performance).
* **Quota Management:** Built-in caching mechanism to optimize API costs and avoid rate limits.

### Core System Features
* **Request Management:** Create, track, approve, and reject support requests.
* **RBAC (Role-Based Access Control):** Secure authentication and strict permission handling based on user roles (User, Admin, Support Agent).
* **CRM & Customer Management:** Manage user information and support history.
* **Workflows:** Flexibly configure request processing workflows.
* **Dashboard & Reporting:** Visual interface with statistical charts for performance tracking.

## Tech Stack

The project is built as a Monorepo (Fullstack) using modern technologies:

### Backend
* **Framework:** [NestJS](https://nestjs.com/) (Node.js) - Modular and scalable architecture.
* **Database:** MongoDB (with [Mongoose](https://mongoosejs.com/)).
* **AI Integration:** Google Gemini API.
* **Authentication:** JWT, Passport.
* **Email:** Nodemailer (Automated notifications).

### Frontend
* **Framework:** [React](https://react.dev/) + [Vite](https://vitejs.dev/).
* **Language:** TypeScript.
* **UI Library:** Bootstrap 5 & Bootstrap Icons.
* **Charts:** Chart.js (Statistical graphs).
* **HTTP Client:** Axios.

## Prerequisites

* **Node.js:** v16 or higher.
* **Package Manager:** npm or yarn.
* **Database:** MongoDB (Local or Cloud Atlas).
* **API Key:** Google Gemini API Key (Get one at [Google AI Studio](https://aistudio.google.com/)).

## Installation

1.  **Clone the repository:**
    ```bash
    git clone <your-repo-url>
    cd <your-project-folder>
    ```

2.  **Install dependencies (for both Backend and Frontend):**
    The project includes a script to install dependencies for both folders.
    ```bash
    npm run install:all
    ```
    *Or manually:*
    ```bash
    cd backend && npm install
    cd ../frontend && npm install
    ```

3.  **Environment Configuration:**
    
    Create a `.env` file in the `backend/` directory and configure the following:
    ```env
    # App Config
    PORT=3000
    
    # Database
    MONGODB_URI=mongodb://localhost:27017/your_database_name
    
    # Authentication
    JWT_SECRET=your_super_secret_key
    
    # Google Gemini AI
    GEMINI_API_KEY=your_actual_api_key_here
    
    # Email Service (Optional)
    MAIL_HOST=smtp.example.com
    MAIL_USER=user@example.com
    MAIL_PASS=password
    ```

## Running the App

The project supports running both Backend and Frontend simultaneously with a single command:

**Development Mode:**
```bash
npm run dev


## Run with Docker

The project is pre-configured with Docker Compose, allowing you to launch the entire system (Backend, Frontend, Database) with a few simple commands, eliminating the need for manual Node.js or MongoDB installation.

### 1. Prerequisites
Ensure your machine has the following installed:
* [Docker](https://www.docker.com/products/docker-desktop/)
* [Docker Compose](https://docs.docker.com/compose/install/)

### 2. Configuration
Before running the application, you must configure your **Google Gemini API Key**.

1.  Open the `docker-compose.yml` file in the root directory.
2.  Locate the `backend` service and the `environment` section.
3.  Replace the `GEMINI_API_KEY` placeholder with your actual key.

```yaml
    # ... inside docker-compose.yml
    backend:
      # ...
      environment:
        - PORT=3000
        - MONGODB_URI=mongodb://mongo:27017/internal_request_system
        - JWT_SECRET=secretKey
        - GEMINI_API_KEY=YOUR_ACTUAL_API_KEY_HERE  <-- Update this line
    # ...

# Start the Application
    docker-compose up --build -d

# Access the Application
    Frontend (Web App): http://localhost (Served via Nginx on port 80)
    Backend API: http://localhost:3000
    Database: MongoDB runs in the background on port 27017.