# Chime - Online Chat Application

Chime is a modern chat application that allows users to create accounts, join chat rooms, and communicate in real-time.

## Features

- User authentication (register, login)
- Create and join chat rooms (limited to 10 people per room)
- Real-time messaging
- Room administrators with privileges
- Responsive design for both desktop and mobile

## Tech Stack

- **Frontend**: HTML, CSS (Tailwind), JavaScript
- **Backend**: Express.js
- **Database**: Supabase
- **Deployment**: Vercel

## Project Structure

```
chat_app/
├── frontend/           # Static frontend files
│   ├── css/            # CSS stylesheets
│   ├── js/             # JavaScript files
│   └── *.html          # HTML pages
│
├── express_backend/    # Express.js backend
│   ├── config/         # Configuration files
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Custom middleware
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── .env            # Environment variables (not in Git)
│   ├── .env.example    # Example environment variables
│   ├── package.json    # Node.js dependencies
│   └── server.js       # Main application file
│
├── vercel.json         # Vercel deployment configuration
├── .gitignore          # Git ignore file
└── README.md           # Project documentation
```

## Getting Started

### Prerequisites

- Node.js (v14 or newer)
- Supabase account

### Installation

1. Clone the repository
2. Set up environment variables:
   - Copy `express_backend/.env.example` to `express_backend/.env`
   - Add your Supabase URL and key to the `.env` file

3. Install backend dependencies:
   ```
   cd express_backend
   npm install
   ```

4. Start the development server:
   ```
   npm run dev
   ```

5. Open `frontend/index.html` in your browser or use a simple HTTP server.

## Deployment

This project is configured for deployment on Vercel:

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Configure the environment variables on Vercel
4. Deploy

## License

MIT 