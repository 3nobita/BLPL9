// hola 
const express = require('express');
const mongoose = require('mongoose');
const userRoutes = require('./routes/userRoutes');
const User = require('./models/User');
const HODTRF = require('./models/HODTRF');
const Form = require('./models/Form');
const Client = require('./models/Client');
const bodyParser = require('body-parser');
const http = require('http');
const socketIo = require('socket.io');
const session = require('express-session');
require('dotenv').config();
const twilio = require('twilio');


const app = express();
const server = http.createServer(app);
const io = socketIo(server);
const PORT = process.env.PORT || 3000;

// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Middleware for parsing request body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set up session
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key', // Change this to a secure random value
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.COOKIE_SECURE || false } // Set to true if using HTTPS
}));

// Use the user router
app.use('/api/users', userRoutes);

app.use((req, res, next) => {
    res.alert = function (data) {
        this.json({ alert: data.message, ...data });
    };
    next();
});

// Render home page
app.get('/', (req, res) => {
    res.render('index');
});
app.get('/login', (req, res) => {
    res.render('login');
});
app.get('/tools', (req, res) => {
    res.render('tools');
});
app.get('/services', (req, res) => {
    res.render('services');
});
app.get('/about', (req, res) => {
    res.render('about');
});
app.get('/contact', (req, res) => {
    res.render('contact');
});
app.get('/info', (req, res) => {
    res.render('info');
});
app.get('/policy', (req, res) => {
    res.render('policy');
});
app.get('/terms', (req, res) => {
    res.render('terms');
});
app.get('/privacypolicy', (req, res) => {
    res.render('privacypolicy');
});
app.get('/form', (req, res) => {
    res.render('form');
});
app.get('/partner',(req,res)=>{
    res.render('partner')
})


// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log('MongoDB connected');

        // Check if the admin user already exists
        const existingAdmin = await User.findOne({ userId: 'admin' });
        if (!existingAdmin) {
            // Create admin user if not exists
            const adminUser = new User({
                userId: 'admin',
                name: 'Admin',
                role: 'admin',
                department: 'Administration',
                password: '123', // Store the password as plain text (not recommended for production)
            });

            await adminUser.save();
            console.log('Admin user created');

        } else {
            console.log('Admin user already exists');
        }
    })
    .catch(err => console.log('MongoDB connection error:', err));


// Start the server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});




// Login route
app.post('/api/login', async (req, res) => {
    const { userId, password } = req.body;
    const user = await User.findOne({ userId });

    if (user && user.password === password) {
        req.session.user = {
            _id: user._id,
            userId: user.userId,
            role: user.role,
            name: user.name
        };

        // Redirect based on role
        switch (user.role) {
            case 'admin':
                return res.redirect('/admin/dashboard');
            case 'hod':
                return res.redirect('/hod/dashboard');
            default:
                res.status(401).send('Invalid role');
        }
    } else {
        res.status(401).send('Invalid credentials');
    }
});



// HOD dashboard route
io.on('connection', (socket) => {
    socket.on('disconnect', () => {
    });
});

// Endpoint to update the decision of a form by ID
app.post('/api/HOD/TRF/:id/decision', async (req, res) => {
    const { id } = req.params;
    const { decision } = req.body;

    try {
        const updatedForm = await HODTRF.findByIdAndUpdate(id, { decision: decision }, { new: true });
        res.json({ message: 'Form decision updated successfully', form: updatedForm });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/admin/decision/:id', async (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {
        try {
            const { decision } = req.body;
            await HODTRF.findByIdAndUpdate(req.params.id, { decision, status: decision });
            res.redirect('/admin/dashboard');
        } catch (error) {
            res.redirect('/admin/dashboard');
        }
    } else {
        res.redirect('/');
    }
});

// Handle form submission and save to database
app.post('/api/HOD/ADMIN/TRF', async (req, res) => {
    try {
        const HODTOADMIN = new HODTRF(req.body); // Use HODTRF model
        await HODTOADMIN.save(); // Save to HODTRF collection
        console.log(HODTOADMIN)
        res.status(201).send('TRF Req Send'); // Success message
    } catch (err) {
        res.status(500).send('Server error'); // Error message
    }
});
app.post('/form', async (req, res) => {
    try {
        const form = new Form(req.body); // Use HODTRF model
        await form.save(); // Save to HODTRF collection
        console.log(form)
        res.status(201).send('Form Req Send'); // Success message
    } catch (err) {
        res.status(500).send('Server error'); // Error message
    }
});

app.get('/hod/TRF_ADMIN', async (req, res) => {
    if (req.session.user && req.session.user.role === 'hod') {
        res.render('hod_trf', {
            user: req.session.user,
        });
    } else {
        res.redirect('/');
    }
});

app.post('/add', async (req, res) => {
    const { userId, name, role, department, password, hodId } = req.body;

    console.log('Received hodId:', hodId); // Debug line to check hodId format

    // Validate required fields
    if (!userId || !name || !role || !department || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // Convert hodId to ObjectId if role is 'employee'
    let hodIdObj = null;
    if (role === 'employee' && hodId) {
        try {
            hodIdObj = mongoose.Types.ObjectId(hodId);
        } catch (err) {
            return res.status(400).json({ message: 'Invalid HOD ID format' });
        }
    }

    const user = new User({
        userId,
        name,
        role,
        department,
        password, // Store password as is (not recommended for production)
        hodId: role === 'employee' ? hodIdObj : null // Set hodId if role is 'employee'
    });

    try {
        await user.save();
        res.redirect('/api/users/list'); // Redirect on successful save
    } catch (err) {
        res.status(400).json({ message: 'Error creating user', error: err });
    }
});

app.post('/api/users/add', async (req, res) => {
    const { userId, name, role, department, password, hodId } = req.body;

    // Validate required fields
    if (!userId || !name || !role || !department || !password) {
        return res.status(400).json({ message: 'Missing required fields' });
    }

    // Validate and convert hodId if role is 'employee'
    let validatedHodId = null;
    if (role === 'employee') {
        if (hodId) {
            if (mongoose.isValidObjectId(hodId)) {
                validatedHodId = new mongoose.Types.ObjectId(hodId); // Use 'new' keyword
            } else {
                return res.status(400).json({ message: 'Invalid HOD ID format' });
            }
        } else {
            return res.status(400).json({ message: 'HOD ID is required for employee role' });
        }
    }

    const user = new User({
        userId,
        name,
        role,
        department,
        password, // Store password as is (not recommended for production)
        hodId: role === 'employee' ? validatedHodId : null // Set hodId if role is 'employee'
    });

    try {
        await user.save();
        res.redirect('/api/users/list'); // Redirect on successful save
    } catch (err) {
        res.status(400).json({ message: 'Error creating user', error: err });
    }
});
// Example Express route to get HODs
app.get('/api/hods', async (req, res) => {
    try {
        const hods = await User.find({ role: 'hod' }, 'userId name'); // Adjust query as needed
        res.json(hods);
    } catch (error) {
        console.error('Error fetching HODs:', error);
        res.status(500).json({ message: 'Error fetching HODs' });
    }
});


app.get('/createUser', async (req, res) => {
    try {
        const hods = await User.find({ role: 'hod' }).select('userId name _id'); // Ensure proper fields are selected
        res.render('createUser', { hods });
    } catch (err) {
        console.error('Error fetching HODs:', err);
        res.status(500).send('Server Error');
    }
});


app.get('/api/users/list', async (req, res) => {
    try {
        const users = await User.find().populate('hodId');
        const hods = await User.find({ role: 'hod' });
        const adminCount = await User.countDocuments({ role: 'admin' });
        const hodCount = await User.countDocuments({ role: 'hod' });
        const driverCount = await User.countDocuments({ role: 'driver' });
        const employeeCount = await User.countDocuments({ role: 'employee' });
        const DhodCount = await User.countDocuments({ role: 'Dhod' });

        res.render('userList', {
            users,
            adminCount,
            hodCount,
            driverCount,
            employeeCount,
            hods // Ensure hods is passed to the template
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

app.get('/hod/dashboard', async (req, res) => {
    if (req.session.user && req.session.user.role === 'hod') {
        let hodId = req.session.user._id;

        try {
            if (!mongoose.Types.ObjectId.isValid(hodId)) {
                return res.status(400).send('Invalid HOD ID');
            }

            // Optional: Add date filter logic here if needed
            // Example: const dateFilter = { createdAt: { $gte: startDate, $lte: endDate } };

            const hodtrf = await HODTRF.find(/* dateFilter */);

            console.log('Sent Forms:', hodtrf);
            console.log('HOD ID:', hodId);

            res.render('hodDashboard', {
                user: req.session.user,
                hodtrf,
                sentCount: hodtrf.length,
            });
        } catch (error) {
            console.error('Error:', error.message);
            res.render('hodDashboard', {
                user: req.session.user,
                hodtrf: [],
                sentCount: 0,
            });
        }
    } else {
        res.redirect('/');
    }
});


app.get('/admin/dashboard', async (req, res) => {
    if (req.session.user && req.session.user.role === 'admin') {

        console.log('Client Query:'); // Debugging line

        try {
            const hodtrfs = await HODTRF.find();
            const clients = await Client.find();
            const form = await Form.find();

            res.render('adminDashboard', {
                user: req.session.user,
                form,
                clients,
                hodtrfs,
                formCount: hodtrfs.length,
                clientCount: clients.length,
                bodyForm: form.length,
            });
            console.log(hodtrfs)
        } catch (error) {
            console.error('Error fetching data:', error); // Debugging line
            res.render('adminDashboard', {
                user: req.session.user,
                clients: [],
                hodtrfs: [],
                form: [],
                bodyForm:0,
                formCount: 0,
                clientCount: 0
            });
        }
    } else {
        res.redirect('/');
    }
});


const XLSX = require('xlsx');
const { Writable } = require('stream');

app.get('/api/download/forms', async (req, res) => {
    try {
        // Fetch form data from MongoDB
        const forms = await Form.find().exec();

        // Convert MongoDB data to a format suitable for Excel
        const data = forms.map(form => ({
            firstName: form.firstName,
            middleName: form.middleName,
            lastName: form.lastName,
            mobileNo: form.mobileNo,
            emailId: form.emailId,
            OTP: form.OTP,
            dateOfBirth: form.dateOfBirth ? form.dateOfBirth.toISOString().split('T')[0] : '', // Format date
            panNumber: form.panNumber,
            companyName: form.companyName,
            companyType: form.companyType,
            joining: form.joining,
            Experience: form.Experience,
            currentEMI: form.currentEMI,
            salaryPaid: form.salaryPaid,
            salaryInHand: form.salaryInHand,
            CIBIL: form.CIBIL,
            loanAmount: form.loanAmount,
            City: form.City,
            pinCode: form.pinCode,
            state: form.state,
        }));

        // Create a new workbook and add a worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Forms');

        // Write the workbook to a buffer
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        // Send the buffer as a file download
        res.setHeader('Content-Disposition', 'attachment; filename=forms.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        console.error('Error generating Excel file:', error);
        res.status(500).send('Error generating Excel file');
    }
});

app.get('/api/download/hodtrf', async (req, res) => {
    try {
        // Fetch HODTRF data from MongoDB
        const hodtrfs = await HODTRF.find().exec();

        // Convert MongoDB data to a format suitable for Excel
        const data = hodtrfs.map(hodtrf => ({
            firstName: hodtrf.firstName,
            middleName: hodtrf.middleName,
            lastName: hodtrf.lastName,
            mobileNo: hodtrf.mobileNo,
            emailId: hodtrf.emailId,
            OTP: hodtrf.OTP,
            dateOfBirth: hodtrf.dateOfBirth ? hodtrf.dateOfBirth.toISOString().split('T')[0] : '', // Format date
            panNumber: hodtrf.panNumber,
            companyName: hodtrf.companyName,
            companyType: hodtrf.companyType,
            joining: hodtrf.joining,
            Experience: hodtrf.Experience,
            currentEMI: hodtrf.currentEMI,
            salaryPaid: hodtrf.salaryPaid,
            salaryInHand: hodtrf.salaryInHand,
            CIBIL: hodtrf.CIBIL,
            loanAmount: hodtrf.loanAmount,
            City: hodtrf.City,
            pinCode: hodtrf.pinCode,
            state: hodtrf.state,
            status: hodtrf.status,
            decision: hodtrf.decision,
        }));

        // Create a new workbook and add a worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'HODTRF');

        // Write the workbook to a buffer
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        // Send the buffer as a file download
        res.setHeader('Content-Disposition', 'attachment; filename=hodtrf.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        console.error('Error generating Excel file:', error);
        res.status(500).send('Error generating Excel file');
    }
});

app.get('/api/download/users', async (req, res) => {
    try {
        // Fetch user data from MongoDB
        const users = await User.find().exec();

        // Convert MongoDB data to a format suitable for Excel
        const data = users.map(user => ({
            name: user.name,
            password: user.password, // Note: Storing passwords in plain text is not recommended
            role: user.role,
            department: user.department,
            userId: user.userId,
        }));

        // Create a new workbook and add a worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');

        // Write the workbook to a buffer
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        // Send the buffer as a file download
        res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        console.error('Error generating Excel file:', error);
        res.status(500).send('Error generating Excel file');
    }
});

app.get('/api/download/clients', async (req, res) => {
    try {
        // Fetch client data from MongoDB
        const clients = await Client.find().exec();

        // Convert MongoDB data to a format suitable for Excel
        const data = clients.map(client => ({
            name: client.name,
            number: client.number,
            massage: client.massage,
        }));

        // Create a new workbook and add a worksheet
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');

        // Write the workbook to a buffer
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

        // Send the buffer as a file download
        res.setHeader('Content-Disposition', 'attachment; filename=clients.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buffer);

    } catch (error) {
        console.error('Error generating Excel file:', error);
        res.status(500).send('Error generating Excel file');
    }
});


const accountSid = process.env.TWILIO_ACCOUNT_SID; // Load from environment variables
const authToken = process.env.TWILIO_AUTH_TOKEN; // Load from environment variables


// Initialize Twilio client
const twilioClient = new twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// Store OTPs in memory (consider using a database for production)
const otps = {};
function formatPhoneNumber(number) {
    const cleanedNumber = number.replace(/[^\d]/g, '');

    if (number.startsWith('+')) {
        return number;
    }

    const defaultCountryCode = '+91'; // Change this to the correct country code as needed

    return `${defaultCountryCode}${cleanedNumber}`;
}

// Endpoint to send OTP
app.post('/send-otp', async (req, res) => {
    const { mobileNo } = req.body;
    const otp = generateNumericOTP(6);

    const formattedMobileNo = formatPhoneNumber(mobileNo);
    console.log("formattedMobileNo",formattedMobileNo)

    // Store OTP with phone number
    otps[formattedMobileNo] = otp;

    try {
        await twilioClient.messages.create({
            body: `Your OTP is: ${otp}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: formattedMobileNo
        });
        res.json({ success: true });
    } catch (error) {
        console.error('Error sending OTP:', error);
        res.json({ success: false });
    }
});

// Endpoint to handle form submission
app.post('/clients', async (req, res) => {
    try {
        const { name, mobileNo, otp, message,address } = req.body;

        // Verify OTP
        const formattedMobileNo = formatPhoneNumber(mobileNo);
        if (otps[formattedMobileNo] && otps[formattedMobileNo] === otp) {
            delete otps[formattedMobileNo]; // Clear OTP after verification

            const client = new Client({ name, mobileNo, message,address });
            await client.save();
            res.status(201).json(client);
            console.log(client)
        } else {
            res.status(400).json({ error: 'Invalid OTP. Please try again.' });
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Function to generate a numeric OTP
function generateNumericOTP(length) {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += Math.floor(Math.random() * 10);
    }
    return otp;
}


app.get('/EMI-CALCULATOR',(req,res)=>{
    res.render('EMI-CALCULATOR')
})
app.get('/Loan-Amount-Calculator',(req,res)=>{
    res.render('Loan-Amount-Calculator')
})
app.get('/Loan-Eligibility-Calculator',(req,res)=>{
    res.render('Loan-Eligibility-Calculator')
})