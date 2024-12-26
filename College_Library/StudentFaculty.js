const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');
const multer = require('multer');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
    secret: 'your_secret_key', // Replace with your own secret
    resave: false,
    saveUninitialized: true,
}));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set up multer for file uploads
const uploadDir = path.join(__dirname, 'uploads'); // Directory for uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Set upload directory
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});

const upload = multer({ storage });

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/Library')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB...', err));

// Define the Student/Faculty schema
const studentFacultySchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    gmail: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    address: { type: String, required: true },
    password: { type: String, required: true }, // Consider hashing this
    branch: { type: String, required: true },
    profilePhoto: { type: String, required: true } // Store filename
});

// Create a model for Student/Faculty
const StudentFaculty = mongoose.model('StudentFaculty', studentFacultySchema);

// Route for student/faculty login page
app.get('/user-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'StudentFaculty', 'login.html'));
});
// Route for student/faculty login page
app.get('/home', (req, res) => {
    res.sendFile(path.join(__dirname, 'StudentFaculty', 'home.html'));
});

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'StudentFaculty', 'index.html'));
});

// Login route for student/faculty
app.post('/user-login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await StudentFaculty.findOne({ username });
        if (!user || user.password !== password) {
            return res.status(401).send("Check Your Email and Password Once");
        }

        // Store the user's ID in the session
        req.session.userId = user._id;

        // Redirect to the user profile page
        res.redirect('/user-profile'); // Ensure this route exists
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).send("Internal server error");
    }
});

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Specify the directory for views if it's not the default 'views'
app.set('views', path.join(__dirname, 'StudentFaculty')); // Adjust the path as necessary

// User profile page route
app.get('/user-profile', async (req, res) => {
    const userId = req.session.userId; 
    if (!userId) {
        return res.redirect('/user-login'); // Redirect to login if not authenticated
    }

    try {
        // Fetch the user details from the database
        const user = await StudentFaculty.findById(userId);
        if (!user) {
            return res.status(404).send("User not found"); // Handle case where user does not exist
        }

        // Render the user profile using EJS
        res.render('user-profile', { user });
    } catch (error) {
        console.error("Error fetching user profile:", error);
        res.status(500).send("Internal server error");
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error during logout:", err);
            return res.status(500).send("Internal server error");
        }
        res.redirect('/user-login'); // Redirect to login page after logout
    });
});



// Define a schema for the books collection
const bookSchema = new mongoose.Schema({
    book_id: { type: String, required: true, unique: true }, // Ensure book_id is unique
    book_name: { type: String, required: true },
    book_type: { type: String, required: true },
    number_of_books: { type: Number, required: true },
    availability: { type: Number, required: true },
    author: { type: String, required: true },
    edition: { type: String, required: true },
    cover_image: { type: String, required: true },
    preview_image_1: { type: String, required: true },
    preview_image_2: { type: String, required: true },
    preview_image_3: { type: String, required: true },
    isbn: { type: String, required: true },
    published_year: { type: Number, required: true },
});

// Create a model for the books collection
const Book = mongoose.model('Book', bookSchema);

// Route to display all books details
app.get('/books', async (req, res) => {
    try {
        const allBooks = await Book.find(); // Fetch all books from the database
        res.render('books', { allBooks }); // Render the EJS template with the books data
    } catch (error) {
        console.error("Error fetching books:", error);
        res.status(500).send("Internal server error");
    }
});

// Route for searching books by type
app.get('/search-books', async (req, res) => {
    const bookType = req.query.book_type;

    try {
        const allBooks = await Book.find({ book_type: bookType });
        res.render('books', { allBooks });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});
// Route for searching books by type
app.get('/search-books2', async (req, res) => {
    const bookName = req.query.book_name;

    try {
        const allBooks = await Book.find({ book_name: bookName });
        res.render('books', { allBooks });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});
// Route for searching books by type
app.get('/search-books3', async (req, res) => {
    const bookId= req.query.book_id;

    try {
        const allBooks = await Book.find({ book_id: bookId });
        res.render('books', { allBooks });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});
// Route for searching books by type
app.get('/search-books4', async (req, res) => {
    const bookAuthor= req.query.author;

    try {
        const allBooks = await Book.find({ author : bookAuthor });
        res.render('books', { allBooks });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});



// LibraryVisit model
const visitSchema = new mongoose.Schema({
    username: { type: String, required: true },
    visit_date: { type: String, required: true },
    entry_time: String,
    exit_time: String,
    time_spent: String // New field to store time spent in HH:MM:SS format
});

const LibraryVisit = mongoose.model('LibraryVisit', visitSchema);

// Route to fetch library visits for the logged-in user
app.get('/library-visits', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/user-login'); // Redirect if not logged in
    }

    try {
        // Retrieve the user's details to get the username
        const user = await StudentFaculty.findById(req.session.userId);
        if (!user) {
            return res.redirect('/user-login'); // Redirect if user not found
        }

        // Fetch library visits for the logged-in user
        const visits = await LibraryVisit.find({ username: user.username });
        res.render('library-visits', { visits }); // Render the library visits page
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Define the Issued Book schema
const issuedBookSchema = new mongoose.Schema({
    issuedId: { type: String, required: true },
    username: { type: String, required: true },
    bookId: { type: String, required: true },
    issuedDate: { type: Date, default: Date.now },
    returnLimitDate: { type: Date },
    returnDate: { type: Date },
    fine: { type: Number, default: 0 },
    status: { type: String, default: 'Issued' }
});

// Create the IssuedBook model
const IssuedBook = mongoose.model('IssuedBook', issuedBookSchema);

module.exports = IssuedBook; // Export the model

// Define the route to display books taken by the user
app.get('/books-taken', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/user-login'); // Redirect if not logged in
    }

    try {
        // Retrieve the user's details to get the username
        const user = await StudentFaculty.findById(req.session.userId);
        if (!user) {
            return res.redirect('/user-login'); // Redirect if user not found
        }

        // Fetch issued books for the logged-in user
        const issuedBooks = await IssuedBook.find({ username: user.username });
        res.render('books-taken', { issuedBooks }); // Render the books-taken page
    } catch (error) {
        console.error("Error fetching issued books:", error);
        res.status(500).send("Internal server error");
    }
});

// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
