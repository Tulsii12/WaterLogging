-- ===================================
-- SUPABASE INCIDENTS TABLE SCHEMA
-- Migration from MongoDB to Supabase
-- ===================================

-- Enable PostGIS for GIS functionality (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create incidents table matching MongoDB structure
CREATE TABLE IF NOT EXISTS incidents (
    id BIGSERIAL PRIMARY KEY,
    
    -- Basic incident information
    type VARCHAR(50) NOT NULL CHECK (type IN ('waterlogging', 'pothole', 'drainage')),
    ward VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Location data
    gps_latitude DECIMAL(10, 8),
    gps_longitude DECIMAL(11, 8),
    gps_accuracy DECIMAL(10, 2),
    location_point GEOMETRY(POINT, 4326),
    ward_verified BOOLEAN DEFAULT false,
    
    -- Image data
    image_filename VARCHAR(255) NOT NULL,
    image_original_name VARCHAR(255),
    image_path TEXT,
    image_thumbnail_path TEXT,
    image_size BIGINT,
    image_mime_type VARCHAR(50),
    image_hash VARCHAR(64) UNIQUE, -- For duplicate detection
    image_url TEXT,
    image_storage_path TEXT, -- Supabase Storage path
    
    -- EXIF metadata from photo
    exif_date_time TIMESTAMP WITH TIME ZONE,
    exif_date_time_original TIMESTAMP WITH TIME ZONE,
    exif_gps_latitude DECIMAL(10, 8),
    exif_gps_longitude DECIMAL(11, 8),
    exif_gps_altitude DECIMAL(10, 2),
    exif_camera_make VARCHAR(100),
    exif_camera_model VARCHAR(100),
    exif_camera_software VARCHAR(100),
    exif_image_width INTEGER,
    exif_image_height INTEGER,
    
    -- Validation results (stored as JSONB)
    validation_timestamp JSONB,
    validation_ai_generated JSONB,
    validation_location JSONB,
    validation_quality JSONB,
    validation_overall_score INTEGER CHECK (validation_overall_score >= 0 AND validation_overall_score <= 100),
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected', 'duplicate')),
    
    -- Timestamps
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- For ML training
    labels JSONB DEFAULT '[]'::jsonb,
    used_for_training BOOLEAN DEFAULT false,
    training_dataset_version VARCHAR(50)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_incidents_status_submitted ON incidents(status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_validation_score ON incidents(validation_overall_score DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_type_ward ON incidents(type, ward);
CREATE INDEX IF NOT EXISTS idx_incidents_image_hash ON incidents(image_hash);
CREATE INDEX IF NOT EXISTS idx_incidents_location_point ON incidents USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_incidents_submitted_at ON incidents(submitted_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_incidents_updated_at
    BEFORE UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to automatically set location_point from GPS coordinates
CREATE OR REPLACE FUNCTION set_location_point()
RETURNS TRIGGER AS $$
BEGIN
    -- If GPS coordinates are provided, create PostGIS point
    IF NEW.gps_latitude IS NOT NULL AND NEW.gps_longitude IS NOT NULL THEN
        NEW.location_point = ST_SetSRID(ST_MakePoint(NEW.gps_longitude, NEW.gps_latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set location_point
CREATE TRIGGER set_incident_location_point
    BEFORE INSERT OR UPDATE ON incidents
    FOR EACH ROW
    EXECUTE FUNCTION set_location_point();

-- Create function to update location point from GPS coordinates
CREATE OR REPLACE FUNCTION update_incident_location(incident_id BIGINT, lng DECIMAL, lat DECIMAL)
RETURNS void AS $$
BEGIN
    UPDATE incidents
    SET location_point = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
    WHERE id = incident_id;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically set location_point when GPS coordinates are provided
CREATE OR REPLACE FUNCTION set_incident_location_point()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.gps_longitude IS NOT NULL AND NEW.gps_latitude IS NOT NULL THEN
        NEW.location_point = ST_SetSRID(ST_MakePoint(NEW.gps_longitude, NEW.gps_latitude), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_location_point_trigger
    BEFORE INSERT OR UPDATE ON incidents
    FOR EACH ROW
    WHEN (NEW.gps_longitude IS NOT NULL AND NEW.gps_latitude IS NOT NULL)
    EXECUTE FUNCTION set_incident_location_point();

-- Enable Row Level Security
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow public read access
CREATE POLICY "Public can view incidents"
    ON incidents FOR SELECT
    USING (true);

-- Allow anyone to insert incidents
CREATE POLICY "Anyone can create incidents"
    ON incidents FOR INSERT
    WITH CHECK (true);

-- Allow authenticated users to update their own incidents
CREATE POLICY "Users can update incidents"
    ON incidents FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- ===================================
-- CREATE STORAGE BUCKET FOR IMAGES
-- ===================================
-- Note: Run this manually in Supabase Dashboard > Storage
-- Or use Supabase CLI/Migration tools
-- 
-- Bucket name: incident-images
-- Public: false (or true if you want public access)
-- Allowed MIME types: image/jpeg, image/png, image/jpg
-- File size limit: 10MB

