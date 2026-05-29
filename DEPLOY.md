# Deployment

Free public deployment option:

- Backend: Render Web Service
- Database: Neon PostgreSQL
- Frontend: Vercel

## 1. Neon

1. Create a free PostgreSQL database in Neon.
2. Copy the connection string. It looks like:
   `postgresql://user:password@host/dbname?sslmode=require`

## 2. Render backend

1. Push the project to GitHub.
2. In Render create a new Web Service from the repository.
3. Use these settings:
   - Root Directory: empty
   - Build Command: `bash build.sh`
   - Start Command: `gunicorn config.wsgi:application`
4. Add environment variables:
   - `DEBUG=False`
   - `SECRET_KEY=<any-long-random-string>`
   - `DATABASE_URL=<Neon connection string>`
   - `ALLOWED_HOSTS=<your-render-domain>`
   - `CORS_ALLOWED_ORIGINS=<your-vercel-domain>`
   - `CSRF_TRUSTED_ORIGINS=<your-vercel-domain>`

Example Render domain: `sport-booking-api.onrender.com`.

## 3. Vercel frontend

1. In Vercel create a new project from the same GitHub repository.
2. Set Root Directory: `frontend`.
3. Add environment variable:
   - `VITE_API_URL=https://<your-render-domain>`
4. Deploy.

Example frontend domain: `https://sport-booking.vercel.app`.

## Notes

On free Render, the backend can sleep after inactivity. The first request after a pause may take longer.

Uploaded media files on Render free hosting are not permanent. For a course demo, use sample data or add external file storage later.
