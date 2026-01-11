const supabase = require('../config/supabase');

// Get all incidents
exports.getAllIncidents = async (req, res) => {
    try {
        const { status, ward_id, limit = 50 } = req.query;

        let query = supabase
            .from('incidents')
            .select(`
                *,
                wards (
                    name,
                    zone
                )
            `)
            .order('reported_at', { ascending: false })
            .limit(limit);

        if (status) {
            query = query.eq('status', status);
        }

        if (ward_id) {
            query = query.eq('ward_id', ward_id);
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json({
            success: true,
            count: data.length,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get incident by ID
exports.getIncidentById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('incidents')
            .select(`
                *,
                wards (
                    name,
                    zone
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Incident not found'
            });
        }

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Create new incident report
exports.createIncident = async (req, res) => {
    try {
        const {
            type,
            ward_id,
            location,
            address,
            description,
            water_depth_cm,
            reporter_name,
            reporter_phone,
            severity
        } = req.body;

        // Generate unique incident code
        const timestamp = Date.now();
        const incident_code = `INC-${timestamp}`;

        const { data, error } = await supabase
            .from('incidents')
            .insert([
                {
                    incident_code,
                    type: type || 'waterlogging',
                    ward_id,
                    location,
                    address,
                    description,
                    water_depth_cm,
                    reporter_name,
                    reporter_phone,
                    severity: severity || 'medium',
                    status: 'pending'
                }
            ])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            message: 'Incident reported successfully',
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update incident status
exports.updateIncidentStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const updates = { status };
        
        if (status === 'resolved') {
            updates.resolved_at = new Date();
        }

        const { data, error } = await supabase
            .from('incidents')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Incident status updated',
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get incident statistics
exports.getIncidentStats = async (req, res) => {
    try {
        // Get total incidents
        const { count: total } = await supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true });

        // Get pending incidents
        const { count: pending } = await supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        // Get resolved incidents
        const { count: resolved } = await supabase
            .from('incidents')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'resolved');

        // Get incidents by severity
        const { data: bySeverity } = await supabase
            .from('incidents')
            .select('severity')
            .order('severity');

        const severityCount = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
        };

        bySeverity.forEach(item => {
            severityCount[item.severity] = (severityCount[item.severity] || 0) + 1;
        });

        res.json({
            success: true,
            data: {
                total,
                pending,
                resolved,
                in_progress: total - pending - resolved,
                by_severity: severityCount
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
