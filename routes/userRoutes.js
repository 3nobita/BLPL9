// routes/userRouters.ejs 
const express = require('express');
const router = express.Router();
const User = require('../models/User');


// User login route
router.post('/user-login', async (req, res) => {
    const { userName, userPassword } = req.body;

    try {
        const user = await User.findOne({ userId: userName });

        if (user && user.password === userPassword) {
            // Redirect based on user role
            const dashboardPath = {
                admin: '/api/users/admin/dashboard',
                hod: '/api/users/hod/dashboard',
                driver: '/api/users/driver/dashboard',
                employee: '/api/users/employee/dashboard',
                Dhod: '/api/users/Dhod/dashboard'
            }[user.role] || '/api/users/employee/dashboard';

            return res.redirect(dashboardPath);
        } else {
            return res.status(403).send('Invalid user credentials');
        }
    } catch (err) {
        res.status(500).send('Server error');
    }
});

// Admin login route
router.post('/admin-login', async (req, res) => {
    const { userId, password } = req.body;

    try {
        const user = await User.findOne({ userId });

        if (user && user.password === password) {
            // Successful login logic
            return res.redirect('/api/users/admin/dashboard');
        } else {
            return res.status(403).send('Invalid admin credentials');
        }
    } catch (err) {
        return res.status(500).send('Server error');
    }
});

// Render add user form
router.get('/createUser', async (req, res) => {
    try {
        // Fetch all HODs from the database
        const hods = await User.find({ role: 'hod' });
        const dhod = await User.find({ role: 'Dhod' });

        // Render the createUser view, passing the list of HODs
        res.render('createUser', { hods,dhod });
    } catch (err) {
        res.status(500).send('Server error');
    }
});


// Edit user route
router.get('/edit/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await User.findOne({ userId: userId });
        const hods = await User.find({ role: 'hod' });
        const Dhods = await User.find({ role: 'Dhod' });

        if (!user) {
            return res.status(404).send('User not found');
        }

        res.render('editUser', {
            user: user,
            hods: hods,
            Dhods
        });
    } catch (error) {
        console.error('Error fetching user or HODs:', error);
        res.status(500).send('Internal Server Error');
    }
});



// Update user
router.post('/edit/:userId', async (req, res) => {
    const { userId } = req.params;
    const { name, role, department, password } = req.body;

    try {
        await User.updateOne({ userId }, { name, role, department, password });
        res.redirect('/api/users/list');
    } catch (err) {
        res.status(400).json({ message: 'Error updating user', error: err });
    }
});

// Delete user
router.post('/delete/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        await User.deleteOne({ userId });
        res.redirect('/api/users/list');
    } catch (err) {
        res.status(400).json({ message: 'Error deleting user', error: err });
    }
});

// List users
router.get('/list', async (req, res) => {
    try {
        const users = await User.find();

        // Count users for each role
        const adminCount = await User.countDocuments({ role: 'admin' });
        const hodCount = await User.countDocuments({ role: 'hod' });
        const driverCount = await User.countDocuments({ role: 'driver' });
        const employeeCount = await User.countDocuments({ role: 'employee' });
        const Dhod = await User.countDocuments({ role: 'Dhod' });

        res.render('userList', {
            users,
            adminCount,
            hodCount,
            driverCount,
            employeeCount,
            Dhod
        });
    } catch (err) {
        res.status(500).send('Error retrieving users');
    }
});

// Search users
router.get('/search', async (req, res) => {
    const { query } = req.query;

    try {
        const users = await User.find({
            $or: [
                { userId: { $regex: query, $options: 'i' } },
                { name: { $regex: query, $options: 'i' } }
            ]
        });

        // Count users for each role
        const adminCount = await User.countDocuments({ role: 'admin' });
        const hodCount = await User.countDocuments({ role: 'hod' });
        const driverCount = await User.countDocuments({ role: 'driver' });
        const employeeCount = await User.countDocuments({ role: 'employee' });
        const Dhod = await User.countDocuments({ role: 'Dhod' });

        res.render('userList', {
            users,
            adminCount,
            hodCount,
            driverCount,
            employeeCount,
            Dhod
        });
    } catch (err) {
        res.status(500).send('Error retrieving users');
    }
});
// Route to render driverDashboard.ejs with bookings data
router.get('/driver/dashboard', async (req, res) => {
    try {
        const bookingList = await Request.find(); // Fetch bookings using the Request model
        res.render('driverDashboard', { bookingList }); // Render driverDashboard.ejs with bookingList data
    } catch (err) {
        console.error('Error fetching bookings:', err);
        res.status(500).send('Server error'); // Handle server error
    }
});
// Logout route
router.get('/logout', (req, res) => {
    // Assuming you are using session or a similar method to track user login
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Could not log out');
        }
        res.redirect('/'); // Redirect to the home page after logout
    });
});





















module.exports = router;
