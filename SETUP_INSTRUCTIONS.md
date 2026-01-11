# 🚀 Delhi Monsoon Dashboard - Setup Instructions

## ✅ Completed Changes

### 1. **Supabase Integration** ✅
- Migrated from MongoDB to Supabase
- Created Supabase schema with PostGIS support
- Images stored in Supabase Storage
- Automatic location_point conversion from GPS coordinates

### 2. **Camera-Only Photo Capture** ✅
- Removed file upload option
- Implemented live camera capture using `getUserMedia`
- Only allows capturing photos directly from device camera
- Prevents uploading old/existing images

### 3. **Improved GPS Accuracy** ✅
- Uses `watchPosition` with `enableHighAccuracy: true`
- Continuously monitors position for best accuracy
- Automatically selects best position (most accurate)
- Real-time accuracy display during capture
- Falls back to best position after multiple attempts

### 4. **Form Validation** ✅
- Real-time validation for all required fields
- Error messages for missing fields
- Validates: Photo capture, Ward selection, Incident type, GPS location
- Submit button only enables when all validations pass

### 5. **Incident Data Storage for ML Training** ✅
- All incidents saved to Supabase with validation scores
- Structured data includes: images, GPS, EXIF, validation results
- Ready for ML model training with proper labels
- Export endpoint for training data: `/api/incidents/training/export`

---

## 📋 Setup Steps

### Step 1: Install Dependencies

```bash
# Navigate to backend folder
cd backend

# Install dependencies
npm install
```

### Step 2: Configure Supabase

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create a new project
   - Note down:
     - Project URL
     - Anon/Public Key
     - Service Role Key (keep secret!)

2. **Run Database Schema**
   - Go to Supabase Dashboard > SQL Editor
   - Run the SQL from `database/supabase_incidents_schema.sql`
   - This creates the incidents table with all fields and triggers

3. **Create Storage Bucket**
   - Go to Supabase Dashboard > Storage
   - Create a new bucket named: `incident-images`
   - Settings:
     - Public: `false` (or `true` if you want public access)
     - Allowed MIME types: `image/jpeg, image/png, image/jpg`
     - File size limit: `10MB`

4. **Set Environment Variables**
   - Create `backend/.env` file:
   ```env
   PORT=3000
   FRONTEND_URL=http://localhost:5500
   
   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   
   # Optional: File upload settings
   MAX_FILE_SIZE=10485760
   ```

### Step 3: Start the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will run on `http://localhost:3000`

### Step 4: Verify Setup

1. **Test Health Endpoint**
   ```bash
   curl http://localhost:3000/health
   ```
   Should return: `{"status":"OK","database":"Connected",...}`

2. **Test Frontend**
   - Open `index.html` in browser
   - Click "Report Incident"
   - Test camera capture
   - Test GPS location capture
   - Submit an incident

---

## 🔧 Key Features

### Camera Capture
- **No file upload**: Only live camera capture allowed
- Uses `getUserMedia` API
- Automatically uses back camera on mobile devices
- Captures high-quality JPEG images

### GPS Location
- **High accuracy**: Uses GPS when available
- **Real-time tracking**: Monitors position for best accuracy
- **Smart selection**: Automatically picks most accurate reading
- **Visual feedback**: Shows accuracy in real-time

### Validation System
- **Timestamp check**: Verifies photo is recent
- **AI detection**: Checks for AI-generated images (placeholder)
- **Location verification**: Validates GPS matches ward
- **Quality check**: Ensures image meets minimum requirements
- **Overall score**: Calculates confidence percentage

### Data Storage
- **Supabase Database**: Structured PostgreSQL storage
- **Supabase Storage**: Images stored in cloud storage
- **PostGIS Support**: Geographic queries and indexing
- **Training Ready**: Data structured for ML training

---

## 📁 File Structure

```
Hack4Delhi/
├── backend/
│   ├── config/
│   │   └── supabase.js          # Supabase client configuration
│   ├── routes/
│   │   └── incidents.js         # API routes (Supabase-based)
│   ├── services/
│   │   ├── incidentService.js   # Supabase operations
│   │   └── validation.js        # Validation functions
│   ├── server.js                # Express server (Supabase)
│   └── package.json             # Dependencies (includes @supabase/supabase-js)
├── database/
│   └── supabase_incidents_schema.sql  # Database schema
├── app.js                       # Frontend JS (camera + GPS)
├── index.html                   # Frontend HTML
├── styles.css                   # Frontend styles
├── .gitignore                   # Git ignore rules
└── SETUP_INSTRUCTIONS.md        # This file
```

---

## 🐛 Troubleshooting

### Camera not working
- **HTTPS required**: Camera API requires HTTPS or localhost
- **Permissions**: Ensure browser has camera permissions
- **Browser support**: Check if browser supports `getUserMedia`

### GPS not accurate
- **Location enabled**: Ensure device location services are on
- **Outdoor**: GPS works better outdoors with clear sky view
- **Wait longer**: High accuracy GPS may take 10-30 seconds
- **Permissions**: Ensure browser has location permissions

### Supabase connection errors
- **Check .env**: Verify SUPABASE_URL and keys are correct
- **Network**: Ensure internet connection is active
- **Bucket**: Verify storage bucket `incident-images` exists
- **RLS Policies**: Check Row Level Security policies in Supabase

### Image upload fails
- **Bucket exists**: Ensure `incident-images` bucket is created
- **Permissions**: Check bucket permissions in Supabase
- **File size**: Ensure image is under 10MB
- **Format**: Only JPEG/PNG supported

---

## 📊 API Endpoints

- `POST /api/incidents` - Submit new incident (with image)
- `GET /api/incidents` - Get all incidents (with filters)
- `GET /api/incidents/:id` - Get specific incident
- `PATCH /api/incidents/:id` - Update incident status
- `GET /api/incidents/stats/summary` - Get statistics
- `GET /api/incidents/training/export` - Export training data

---

## 🎯 Next Steps

1. **Set up Supabase project** and run the schema
2. **Configure environment variables** in `backend/.env`
3. **Create storage bucket** in Supabase Dashboard
4. **Test the application** with camera and GPS
5. **Deploy** to production when ready

---

## 📝 Notes

- All incident images are saved for ML training purposes
- GPS coordinates are automatically converted to PostGIS points
- Validation scores help prioritize incident reviews
- Camera-only capture ensures photo authenticity
- High-accuracy GPS improves location reliability

