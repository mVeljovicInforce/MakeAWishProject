# Hidden Wishes

A peaceful, anonymous web application where visitors can share private wishes, hopes, dreams, and thoughts without revealing their identity.

## Features

- **Anonymous sharing**: No accounts, usernames, or profiles required
- **Privacy-first**: No collection of personal data (no emails, IP addresses, or identification)
- **Random wish discovery**: View random wishes submitted by others
- **Simple submission**: Submit wishes up to 500 characters
- **Responsive design**: Works beautifully on desktop and mobile
- **Minimal interface**: Clean, atmospheric design with smooth animations

## Project Structure

```
hidden-wishes/
├── package.json           # Project dependencies
├── server.js             # Express server and API endpoints
├── database.js           # SQLite database module
├── seed.js              # Database seeding script
├── README.md            # This file
├── public/
│   ├── index.html       # Landing page
│   ├── styles.css       # Styling
│   └── app.js          # Frontend JavaScript
└── data/
    └── wishes.db        # SQLite database (created at runtime)
```

## Technical Stack

- **Backend**: Node.js + Express.js
- **Database**: SQLite3
- **Frontend**: Vanilla HTML, CSS, and JavaScript
- **Security**: Input sanitization, parameterized SQL queries

## Installation

1. **Clone or navigate to the project directory**:

   ```bash
   cd hidden-wishes
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Seed the database with sample wishes** (optional, but recommended):
   ```bash
   node seed.js
   ```

## Running the Application

Start the server:

```bash
npm start
```

The application will be available at **http://localhost:3000**

You should see output like:

```
✨ Hidden Wishes app running at http://localhost:3000
📚 Database contains 20 wishes
```

## API Endpoints

### GET /api/wishes/random

Fetch random wishes from the database.

**Query Parameters:**

- `count` (optional): Number of wishes to return (1-10, default: 3)

**Response:**

```json
[
  {
    "id": 1,
    "text": "I wish my father knew how much I appreciate him.",
    "created_at": "2025-01-15T10:30:00.000Z"
  }
]
```

### POST /api/wishes

Submit a new wish.

**Request Body:**

```json
{
  "text": "I wish to travel the world someday."
}
```

**Requirements:**

- Text is required and must be a non-empty string
- Maximum 500 characters
- Whitespace is trimmed
- HTML/script tags are sanitized

**Response (201 Created):**

```json
{
  "id": 21,
  "text": "I wish to travel the world someday.",
  "created_at": "2025-01-15T14:45:00.000Z"
}
```

### GET /api/health

Health check endpoint.

**Response:**

```json
{
  "status": "ok",
  "wishCount": 20
}
```

## Database Schema

### wishes table

| Column     | Type                  | Description                     |
| ---------- | --------------------- | ------------------------------- |
| id         | INTEGER (PRIMARY KEY) | Auto-incrementing wish ID       |
| text       | TEXT                  | The wish content (sanitized)    |
| created_at | DATETIME              | Timestamp when wish was created |

## Security Features

- **Input validation**: All input is validated on the backend
- **Sanitization**: HTML/script tags are escaped to prevent injection
- **Parameterized queries**: SQL is protected against injection attacks
- **No personal data**: Application does not collect or store any identifying information
- **CORS-friendly**: API works with modern fetch requests

## Design Philosophy

- **Minimal**: No unnecessary features or distractions
- **Peaceful**: Soft colors, plenty of whitespace, smooth animations
- **Anonymous**: Complete privacy for wish submission
- **Responsive**: Works seamlessly on any device
- **Accessible**: Clear typography, good contrast, semantic HTML

## Customization

### Change the port

Set the `PORT` environment variable:

```bash
PORT=4000 npm start
```

### Modify styling

Edit `public/styles.css` to customize colors, fonts, and animations.

### Add more sample wishes

Edit the `sampleWishes` array in `seed.js` and run `node seed.js` again.

## Limitations & Future Improvements

### Current Limitations

- No moderation system (wishes are published immediately)
- No way to edit or delete wishes after submission
- Database stored locally (not suitable for multi-server deployments)
- No rate limiting (vulnerable to spam/abuse in production)
- Limited wish lifespan management

### Recommendations for Production

1. **Add moderation**: Implement a review queue or keyword filtering for inappropriate wishes
2. **Add rate limiting**: Use middleware like `express-rate-limit` to prevent abuse
3. **Add authentication for admin**: Implement admin panel for moderation/deletion
4. **Move to managed database**: Use PostgreSQL, MySQL, or cloud database for scalability
5. **Add caching**: Implement Redis to cache frequently accessed wishes
6. **Add monitoring**: Set up error logging (e.g., Sentry) and analytics
7. **Add HTTPS**: Require SSL/TLS in production
8. **Add data cleanup**: Implement automatic deletion of very old wishes
9. **Add captcha**: Use reCAPTCHA to prevent bot spam
10. **Add testing**: Create unit and integration tests

## License

MIT

## Author

Created as a peaceful platform for anonymous wishes.

# MakeAWishProject
