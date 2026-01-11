const supabase = require('../config/supabase');

// Get all wards
exports.getAllWards = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('wards')
            .select('*')
            .order('name', { ascending: true });

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

// Get ward by ID
exports.getWardById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('wards')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        if (!data) {
            return res.status(404).json({
                success: false,
                error: 'Ward not found'
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

// Get high-risk wards
exports.getHighRiskWards = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('wards')
            .select('*')
            .in('risk_level', ['critical', 'alert'])
            .order('mpi_score', { ascending: true });

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

// Update ward status (admin function)
exports.updateWardStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const { data, error } = await supabase
            .from('wards')
            .update({
                ...updates,
                last_updated: new Date()
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Ward updated successfully',
            data: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
