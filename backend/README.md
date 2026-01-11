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
