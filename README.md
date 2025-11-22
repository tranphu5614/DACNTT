IT Helpdesk AI Assistant
- This project is a NestJS-based backend service for an IT Helpdesk system. It integrates Google Gemini AI to automatically classify ticket priority and suggest quick fixes for common issues.

- Features:
    + Auto Priority Classification: Automatically categorizes tickets as LOW, MEDIUM, HIGH, or URGENT.
    + Smart Auto-Reply: Suggests quick fixes for simple issues (e.g., "reset password", "check cable") to reduce agent workload.
    + Model Auto-Discovery: Automatically detects and uses the best available Google Gemini model (prioritizing gemini-1.5-flash for speed and higher rate limits).
    + Quota Management: Built-in caching to minimize API usage and avoid rate limits.

- Prerequisites
    + Node.js: v16 or higher.
    + npm or yarn.
    + A Google Gemini API Key (Get one at Google AI Studio).

- Installation
    + Clone the repository:
        git clone <your-repo-url>
        cd <your-project-folder>

    + Install dependencies:
        npm install

- Configuration
    + In file docker-compose in the root directory.
    + Add your Google Gemini API Key:
    + GEMINI_API_KEY=your_actual_api_key_here


- Running the Application

- Development Mode

- To run the server in development mode (with hot-reload):

    + npm run start:dev
    + The server will start at http://localhost:3000.

- Production Mode

    + npm run build
    + npm run start:prod


