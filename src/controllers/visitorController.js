const Visitor = require('../models/Visitor');
const User = require('../models/User');

// Check-in visitor
const checkInVisitor = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required',
            });
        }

        // Check if user exists in database
        const user = await User.findOne({ phone });
        
        // Check if visitor already exists
        let visitor = await Visitor.findOne({ phone });

        if (visitor) {
            // Update existing visitor
            visitor.visitCount += 1;
            visitor.lastVisit = new Date();
            visitor.visits.push({ timestamp: new Date() });
            
            // Update member status if user found
            if (user && !visitor.isMember) {
                visitor.isMember = true;
                visitor.userId = user._id;
            }
            
            await visitor.save();
        } else {
            // Create new visitor
            visitor = new Visitor({
                phone,
                isMember: !!user,
                userId: user ? user._id : null,
                visitCount: 1,
                lastVisit: new Date(),
                visits: [{ timestamp: new Date() }]
            });
            
            await visitor.save();
        }

        // Populate user details if member
        if (visitor.isMember && visitor.userId) {
            await visitor.populate('userId', 'fullName email phone birthday governmentId rewardPoints status createdAt role');
        }

        res.status(200).json({
            success: true,
            message: 'Check-in successful!',
            data: {
                visitor,
                isMember: visitor.isMember,
                isNewVisitor: visitor.visitCount === 1,
                userName: user ? user.fullName : null,
            },
        });
    } catch (error) {
        console.error('Error checking in visitor:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking in visitor',
            error: error.message,
        });
    }
};

// Admin: Get all visitors
const getAllVisitors = async (req, res) => {
    try {
        const { page = 1, limit = 50, search = '', memberFilter = 'all', date = '' } = req.query;

        const query = {};

        // Search by phone
        if (search) {
            // Escape special regex characters in phone number
            const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.phone = { $regex: escapedSearch, $options: 'i' };
        }

        // Filter by member status
        if (memberFilter === 'members') {
            query.isMember = true;
        } else if (memberFilter === 'non-members') {
            query.isMember = false;
        }

        // Filter by date
        if (date) {
            const startDate = new Date(date);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(date);
            endDate.setHours(23, 59, 59, 999);
            query.lastVisit = { $gte: startDate, $lte: endDate };
        }

        const visitors = await Visitor.find(query)
            .populate('userId', 'fullName email phone birthday governmentId rewardPoints status createdAt role')
            .populate('visits.adminId', 'fullName email')
            .sort({ lastVisit: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const count = await Visitor.countDocuments(query);

        // Get statistics
        const totalVisitors = await Visitor.countDocuments();
        const totalMembers = await Visitor.countDocuments({ isMember: true });
        const totalNonMembers = await Visitor.countDocuments({ isMember: false });
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayVisitors = await Visitor.countDocuments({ 
            lastVisit: { $gte: todayStart } 
        });

        res.json({
            success: true,
            data: visitors,
            pagination: {
                total: count,
                page: parseInt(page),
                pages: Math.ceil(count / limit),
            },
            statistics: {
                totalVisitors,
                totalMembers,
                totalNonMembers,
                todayVisitors,
            },
        });
    } catch (error) {
        console.error('Error fetching visitors:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching visitors',
            error: error.message,
        });
    }
};

// Admin: Get visitor details
const getVisitorDetails = async (req, res) => {
    try {
        const { id } = req.params;

        const visitor = await Visitor.findById(id).populate('userId', 'fullName email phone birthday governmentId rewardPoints status createdAt role');

        if (!visitor) {
            return res.status(404).json({
                success: false,
                message: 'Visitor not found',
            });
        }

        res.json({
            success: true,
            data: visitor,
        });
    } catch (error) {
        console.error('Error fetching visitor details:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching visitor details',
            error: error.message,
        });
    }
};

// Admin: Delete visitor
const deleteVisitor = async (req, res) => {
    try {
        const { id } = req.params;

        const visitor = await Visitor.findById(id);
        if (!visitor) {
            return res.status(404).json({
                success: false,
                message: 'Visitor not found',
            });
        }

        await Visitor.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Visitor deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting visitor:', error);
        res.status(500).json({
            success: false,
            message: 'Error deleting visitor',
            error: error.message,
        });
    }
};

// Admin: Manual check-in for a user
const adminCheckInUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const adminId = req.user.id; // From auth middleware

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Find or create visitor record
        let visitor = await Visitor.findOne({ userId });

        if (visitor) {
            // Update existing visitor
            visitor.visitCount += 1;
            visitor.lastVisit = new Date();
            visitor.visits.push({ 
                timestamp: new Date(),
                checkedInBy: 'admin',
                adminId: adminId
            });
            await visitor.save();
        } else {
            // Create new visitor record
            visitor = new Visitor({
                phone: user.phone,
                isMember: true,
                userId: user._id,
                visitCount: 1,
                lastVisit: new Date(),
                visits: [{ 
                    timestamp: new Date(),
                    checkedInBy: 'admin',
                    adminId: adminId
                }]
            });
            await visitor.save();
        }

        // Populate admin details
        await visitor.populate('visits.adminId', 'fullName email');

        res.status(200).json({
            success: true,
            message: `Check-in successful for ${user.fullName}`,
            data: {
                visitor,
                user: {
                    fullName: user.fullName,
                    phone: user.phone,
                    email: user.email
                }
            },
        });
    } catch (error) {
        console.error('Error in admin check-in:', error);
        res.status(500).json({
            success: false,
            message: 'Error checking in user',
            error: error.message,
        });
    }
};

// Admin: Get visitor by user ID
const getVisitorByUserId = async (req, res) => {
    try {
        const { userId } = req.params;

        const visitor = await Visitor.findOne({ userId })
            .populate('userId', 'fullName email phone birthday governmentId rewardPoints status createdAt role')
            .populate('visits.adminId', 'fullName email');

        if (!visitor) {
            return res.status(404).json({
                success: false,
                message: 'Visitor record not found',
            });
        }

        res.json({
            success: true,
            data: visitor,
        });
    } catch (error) {
        console.error('Error fetching visitor by user ID:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching visitor',
            error: error.message,
        });
    }
};

module.exports = {
    checkInVisitor,
    getAllVisitors,
    getVisitorDetails,
    deleteVisitor,
    adminCheckInUser,
    getVisitorByUserId,
};
