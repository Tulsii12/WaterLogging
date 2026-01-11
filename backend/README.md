# 🌊 Delhi Water-Logging Dashboard - Backend API

## 📦 Installation Complete! ✅

Backend structure created with:
- ✅ Express server with CORS
- ✅ Supabase database connection
- ✅ Socket.IO for real-time updates
- ✅ 3 Core API modules (Wards, Incidents, Alerts)

## 🚀 Quick Start

### 1. Configure Supabase Connection

Edit `backend/.env` file with your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key
```

**Get your credentials:**
1. Go to https://supabase.com/dashboard
2. Open your project
3. Settings → API
4. Copy URL and keys

### 2. Start the Server

```bash
cd backend
npm run dev
```

Server will start on: **http://localhost:5000**

### 3. Test the API

Open browser and visit:
- Health check: http://localhost:5000/health
- API docs: http://localhost:5000/

## 📡 API Endpoints

### Wards
- `GET /api/wards` - Get all wards
- `GET /api/wards/high-risk` - Get high-risk wards
- `GET /api/wards/:id` - Get specific ward
- `PUT /api/wards/:id` - Update ward status

### Incidents
- `GET /api/incidents` - Get all incidents
- `GET /api/incidents/stats` - Get statistics
- `GET /api/incidents/:id` - Get specific incident
- `POST /api/incidents` - Report new incident
- `PUT /api/incidents/:id/status` - Update status

### Alerts
- `GET /api/alerts` - Get active alerts
- `GET /api/alerts/ward/:wardId` - Get ward alerts
- `POST /api/alerts` - Create new alert
- `PUT /api/alerts/:id/dismiss` - Dismiss alert

## 🔧 Next Steps

1. **Setup Supabase Database** (if not done)
   - Run the `database/schema.sql` in Supabase SQL Editor
   - This creates all necessary tables

2. **Test the APIs** using:
   - Browser for GET requests
   - Postman/Thunder Client for POST/PUT
   - Or connect your frontend

3. **Add sample data** to test:
   ```sql
   -- Run this in Supabase SQL Editor
   INSERT INTO wards (name, zone, mpi_score, risk_level) 
   VALUES ('Central Delhi - 1', 'Central Delhi', 65, 'safe');
   ```

## 📁 Project Structure

```
backend/
├── .env                    # Your configuration (not in git)
├── .env.example           # Template
├── package.json
├── server.js              # Main server file
├── config/
│   └── supabase.js       # Database connection
├── routes/
│   ├── wards.js          # Ward routes
│   ├── incidents.js      # Incident routes
│   └── alerts.js         # Alert routes
├── controllers/
│   ├── wardController.js
│   ├── incidentController.js
│   └── alertController.js
└── middleware/
    ├── errorHandler.js
    └── rateLimiter.js
```

## 🐛 Troubleshooting

**Error: "Missing Supabase credentials"**
- Make sure you've updated the `.env` file with your actual Supabase URL and keys

**Port already in use:**
- Change `PORT=5000` to another port in `.env`

**Cannot connect to Supabase:**
- Check your internet connection
- Verify Supabase credentials are correct
- Make sure your Supabase project is active

## 📝 Development Commands

```bash
npm run dev     # Start with auto-reload
npm start       # Start production server
```
# Delhi Monsoon Dashboard - Backend API

Complete backend implementation for incident reporting with real validation, database storage, and ML training data collection.

## Quick Start

```bash
# Install dependencies
npm install

# Start MongoDB (if using local)
net start MongoDB

# Start server
npm start
```

## API Endpoints

- `POST /api/incidents` - Submit new incident with image
- `GET /api/incidents` - Get all incidents (with filters)
- `GET /api/incidents/:id` - Get specific incident
- `PATCH /api/incidents/:id` - Update incident status
- `GET /api/incidents/stats/summary` - Get statistics
- `GET /api/incidents/training/export` - Export training data

## Features

✅ Real EXIF data extraction  
✅ 4-layer validation (timestamp, AI, location, quality)  
✅ MongoDB database storage  
✅ Image processing with Sharp  
✅ Duplicate detection  
✅ ML training data export  

## Documentation

See `BACKEND_SETUP_GUIDE.md` for complete setup instructions and Postman testing examples.

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Multer (file uploads)
- Sharp (image processing)
- EXIF-parser (metadata extraction)
