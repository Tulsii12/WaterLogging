import supabase, { STORAGE_BUCKET } from '../config/supabase.js';
import { extractEXIF, calculateFileHash } from './validation.js';

/**
 * Save incident to Supabase
 */
export async function saveIncident(incidentData) {
    try {
        // Insert incident into database
        // The trigger will automatically set location_point from GPS coordinates
        const { data, error } = await supabase
            .from('incidents')
            .insert([incidentData])
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to save incident: ${error.message}`);
        }

        return data;
    } catch (error) {
        console.error('Error saving incident to Supabase:', error);
        throw error;
    }
}

/**
 * Upload image to Supabase Storage
 */
export async function uploadImageToStorage(file, filename) {
    try {
        // Ensure we have a Buffer
        const fileBuffer = Buffer.isBuffer(file) ? file : Buffer.from(file);
        
        // Supabase accepts Buffer, Uint8Array, or ArrayBuffer
        // Convert Buffer to Uint8Array for better compatibility
        const uint8Array = new Uint8Array(fileBuffer);

        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(filename, uint8Array, {
                contentType: 'image/jpeg',
                upsert: false,
                cacheControl: '3600'
            });

        if (error) {
            throw new Error(`Failed to upload image: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(data.path);

        return {
            path: data.path,
            url: urlData.publicUrl,
            fullPath: data.fullPath || data.path
        };
    } catch (error) {
        console.error('Error uploading image to Supabase Storage:', error);
        throw error;
    }
}

/**
 * Upload thumbnail to Supabase Storage
 */
export async function uploadThumbnailToStorage(thumbnailBuffer, filename) {
    try {
        // Ensure we have a Buffer
        const buffer = Buffer.isBuffer(thumbnailBuffer) ? thumbnailBuffer : Buffer.from(thumbnailBuffer);
        
        // Supabase accepts Buffer, Uint8Array, or ArrayBuffer
        // Convert Buffer to Uint8Array for better compatibility
        const uint8Array = new Uint8Array(buffer);

        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(`thumbnails/${filename}`, uint8Array, {
                contentType: 'image/jpeg',
                upsert: false,
                cacheControl: '3600'
            });

        if (error) {
            throw new Error(`Failed to upload thumbnail: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(data.path);

        return {
            path: data.path,
            url: urlData.publicUrl,
            fullPath: data.fullPath || data.path
        };
    } catch (error) {
        console.error('Error uploading thumbnail to Supabase Storage:', error);
        throw error;
    }
}

/**
 * Check for duplicate incident by image hash
 */
export async function checkDuplicateIncident(imageHash) {
    try {
        const { data, error } = await supabase
            .from('incidents')
            .select('id, image_hash')
            .eq('image_hash', imageHash)
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error;
        }

        return data !== null;
    } catch (error) {
        console.error('Error checking duplicate incident:', error);
        return false;
    }
}

/**
 * Get all incidents with filters
 */
export async function getIncidents(filters = {}, pagination = {}) {
    try {
        let query = supabase
            .from('incidents')
            .select('*', { count: 'exact' });

        // Apply filters
        if (filters.status) {
            query = query.eq('status', filters.status);
        }
        if (filters.type) {
            query = query.eq('type', filters.type);
        }
        if (filters.ward) {
            query = query.eq('ward', filters.ward);
        }
        if (filters.minScore) {
            query = query.gte('validation_overall_score', filters.minScore);
        }

        // Apply pagination
        const page = pagination.page || 1;
        const limit = pagination.limit || 20;
        const from = (page - 1) * limit;
        const to = from + limit - 1;

        query = query
            .order('submitted_at', { ascending: false })
            .range(from, to);

        const { data, error, count } = await query;

        if (error) {
            throw new Error(`Failed to fetch incidents: ${error.message}`);
        }

        return {
            data: data || [],
            pagination: {
                page,
                limit,
                total: count || 0,
                pages: Math.ceil((count || 0) / limit)
            }
        };
    } catch (error) {
        console.error('Error fetching incidents:', error);
        throw error;
    }
}

/**
 * Get incident by ID
 */
export async function getIncidentById(id) {
    try {
        const { data, error } = await supabase
            .from('incidents')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                return null; // Not found
            }
            throw new Error(`Failed to fetch incident: ${error.message}`);
        }

        return data;
    } catch (error) {
        console.error('Error fetching incident:', error);
        throw error;
    }
}

/**
 * Update incident status
 */
export async function updateIncidentStatus(id, status, reviewedBy = null) {
    try {
        const updateData = {
            status,
            reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        if (reviewedBy) {
            updateData.reviewed_by = reviewedBy;
        }

        const { data, error } = await supabase
            .from('incidents')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update incident: ${error.message}`);
        }

        return data;
    } catch (error) {
        console.error('Error updating incident:', error);
        throw error;
    }
}

/**
 * Get statistics for dashboard
 */
export async function getIncidentStats() {
    try {
        // Get counts by status
        const { data: statusData, error: statusError } = await supabase
            .from('incidents')
            .select('status, validation_overall_score');

        if (statusError) {
            throw statusError;
        }

        // Get counts by type
        const { data: typeData, error: typeError } = await supabase
            .from('incidents')
            .select('type');

        if (typeError) {
            throw typeError;
        }

        // Calculate statistics
        const statusStats = {};
        let totalScore = 0;
        let scoreCount = 0;

        statusData.forEach(incident => {
            if (!statusStats[incident.status]) {
                statusStats[incident.status] = { count: 0, avgScore: 0 };
            }
            statusStats[incident.status].count++;

            if (incident.validation_overall_score !== null) {
                totalScore += incident.validation_overall_score;
                scoreCount++;
            }
        });

        // Calculate average scores
        Object.keys(statusStats).forEach(status => {
            const statusIncidents = statusData.filter(i => i.status === status && i.validation_overall_score !== null);
            if (statusIncidents.length > 0) {
                const avg = statusIncidents.reduce((sum, i) => sum + i.validation_overall_score, 0) / statusIncidents.length;
                statusStats[status].avgScore = Math.round(avg);
            }
        });

        const typeStats = {};
        typeData.forEach(incident => {
            typeStats[incident.type] = (typeStats[incident.type] || 0) + 1;
        });

        const { count } = await supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true });

        return {
            byStatus: Object.entries(statusStats).map(([status, stats]) => ({
                _id: status,
                count: stats.count,
                avgScore: stats.avgScore
            })),
            byType: Object.entries(typeStats).map(([type, count]) => ({
                _id: type,
                count
            })),
            total: count || 0
        };
    } catch (error) {
        console.error('Error fetching statistics:', error);
        throw error;
    }
}

/**
 * Get incidents for ML training
 */
export async function getTrainingData(filters = {}) {
    try {
        let query = supabase
            .from('incidents')
            .select('*')
            .eq('status', 'verified')
            .gte('validation_overall_score', filters.minScore || 75);

        const { data, error } = await query.order('submitted_at', { ascending: false });

        if (error) {
            throw new Error(`Failed to fetch training data: ${error.message}`);
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching training data:', error);
        throw error;
    }
}

