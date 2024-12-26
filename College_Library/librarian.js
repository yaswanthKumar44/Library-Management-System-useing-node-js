// Required packages
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const session = require('express-session');
const router = express.Router();
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// Set EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'Librarian'));

// MongoDB Connection


mongoose.connect('mongodb://localhost:27017/Library')
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('Could not connect to MongoDB...', err));

// Define a Mongoose schema and model for librarians
const librarianSchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    password: { type: String, required: true },
    qualification: { type: String, required: true },
    profilePhoto: { type: String, required: true }
});

const Librarian = mongoose.model('Librarian', librarianSchema);

// Multer setup for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads'); // Save files to the uploads folder
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname)); // Append timestamp to file name
    }
});

const upload = multer({ storage: storage });

// Use session middleware
app.use(session({
    secret: 'your_secret_key', // Replace with your secret key
    resave: false,
    saveUninitialized: true,
}));

// Routes
app.get('/librarian-login', (req, res) => {
    res.sendFile(path.join(__dirname, 'Librarian', 'librarian-login.html'));
});
// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Librarian', 'index.html'));
});

// Login route
app.post('/librarian-login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const librarian = await Librarian.findOne({ username });
        if (!librarian || librarian.password !== password) {
            return res.status(401).send("Invalid credentials");
        }

        // Store the librarian's ID in the session
        req.session.librarianId = librarian._id;

        // Redirect to the librarian profile page
        res.redirect('/librarian-profile');
    } catch (error) {
        console.error("Error during login:", error);
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
        res.redirect('/librarian-login');
    });
});

// Profile page route
app.get('/librarian-profile', async (req, res) => {
    const librarianId = req.session.librarianId; 
    if (!librarianId) {
        return res.redirect('/librarian-login'); // Redirect to login if not authenticated
    }

    try {
        const librarian = await Librarian.findById(librarianId);
        res.render('librarian-profile', { librarian });
    } catch (error) {
        console.error("Error fetching librarian profile:", error);
        res.status(500).send("Internal server error");
    }
});

// Profile edit route
app.post('/edit-profile', upload.single('profilePhoto'), async (req, res) => {
    const { name, email, mobile, password } = req.body;
    const profilePhoto = req.file ? `uploads/${req.file.filename}` : req.body.existingProfilePhoto;

    console.log("Uploaded File Path:", profilePhoto); // Log the file path

    try {
        const librarianId = req.session.librarianId; 
        await Librarian.findByIdAndUpdate(librarianId, {
            name,
            email,
            mobile,
            password,
            profilePhoto // Update profile photo path if needed
        });
        
        // Redirect back to the profile page after update
        res.redirect('/librarian-profile'); 
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).send("Internal server error");
    }
});




// Route to render the librarian home page
app.get('/librarian-home', (req, res) => {
    res.sendFile(path.join(__dirname, 'Librarian', 'librarian-home.html'));
});
app.get('/add-student-faculty', (req, res) => {
    res.sendFile(path.join(__dirname, 'Librarian', 'add-student-faculty.html'));
});

app.get('/add-library-visit', (req, res) => {
    res.sendFile(path.join(__dirname, 'Librarian', 'add-library-visit.html'));
});
app.get('/library_books_issue', (req, res) => {
    res.sendFile(path.join(__dirname, 'Librarian', 'library_books_issue.html'));
});


// Define a schema for Student/Faculty
const studentFacultySchema = new mongoose.Schema({
    name: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    type: { type: String, required: true },
    gmail: { type: String, required: true, unique: true },
    mobile: { type: String, required: true },
    address: { type: String, required: true },
    password: { type: String, required: true }, // Consider hashing this
    branch: { type: String, required: true },
    profilePhoto: { type: String, required: true }
});

// Create a model
const StudentFaculty = mongoose.model('StudentFaculty', studentFacultySchema);

// Handle form submission
app.post('/submit-student-faculty', upload.single('profilePhoto'), async (req, res) => {
    const { name, username, type, gmail, mobile, address, password, branch } = req.body;
    const profilePhoto = req.file.filename; // Get the uploaded file name

    try {
        // Create a new document
        const newEntry = new StudentFaculty({
            name,
            username,
            type,
            gmail,
            mobile,
            address,
            password, // Hash this in production
            branch,
            profilePhoto
        });

        // Save the document to the database
        await newEntry.save();

        console.log('Student/Faculty added successfully:', newEntry);
        res.send('Student/Faculty added successfully!');
    } catch (err) {
        console.error('Error inserting data:', err);
        res.status(500).send('Mail id or password are already in use');
    }
});


// Route to display all Student/Faculty details
app.get('/view-students-faculty', async (req, res) => {
    try {
        const allMembers = await StudentFaculty.find(); // Fetch all members from the database
        res.render('view-students-faculty', { allMembers }); // Render the EJS template with the members data
    } catch (error) {
        console.error("Error fetching members:", error);
        res.status(500).send("Internal server error");
    }
});


// Route to get member details for editing
app.get('/edit-member/:username', async (req, res) => {
    const username = req.params.username;
    try {
        const member = await StudentFaculty.findOne({ username }); // Find the member by username
        if (member) {
            res.render('edit-member', { member }); // Render the edit-member EJS template with member data
        } else {
            res.status(404).send("Member not found");
        }
    } catch (error) {
        console.error("Error fetching member for editing:", error);
        res.status(500).send("Internal server error");
    }
});

app.post('/update-member/:username', upload.single('profilePhoto'), async (req, res) => {
    const username = req.params.username;
    const { name, type, gmail, mobile, address, password, branch } = req.body;
    const profilePhoto = req.file ? req.file.filename : null;

    try {
        console.log("Form data:", req.body);
        console.log("Uploaded file:", req.file);

        const updatedMember = await StudentFaculty.findOneAndUpdate(
            { username },
            {
                name,
                type,
                gmail,
                mobile,
                address,
                password, // Hash in production
                branch,
                ...(profilePhoto && { profilePhoto }),
            },
            { new: true }
        );

        if (updatedMember) {
            res.redirect('/view-students-faculty');
        } else {
            res.status(404).send("Member not found");
        }
    } catch (error) {
        console.error("Error updating member:", error);
        res.status(500).send("Internal server error");
    }
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



const visitSchema = new mongoose.Schema({
    username: { type: String, required: true },
    visit_date: { type: String, required: true },
    entry_time: String,
    exit_time: String,
    time_spent: String // New field to store time spent in HH:MM:SS format
});

const LibraryVisit = mongoose.model('LibraryVisit', visitSchema);

// Route to handle library visit logging
app.post('/add-library-visit', async (req, res) => {
    const username = req.body.username;
    const currentDate = new Date().toISOString().split('T')[0]; // Format: YYYY-MM-DD
    const currentTime = new Date().toTimeString().split(' ')[0]; // Format: HH:MM:SS

    try {
        // Check if the username exists in the StudentFaculty collection
        const userExists = await StudentFaculty.findOne({ username: username });
        if (!userExists) {
            return res.status(400).send('Invalid username'); // Send error message
        }

        // Check for an existing entry with the username and today's date, without an exit time
        let visit = await LibraryVisit.findOne({ username: username, visit_date: currentDate, exit_time: null });

        if (visit) {
            // If found, update the exit time and calculate time spent
            visit.exit_time = currentTime;
            visit.time_spent = calculateTimeDifference(visit.entry_time, currentTime);
            await visit.save();
            return res.send('Exit time updated successfully with time spent in library.'); // Send success message
        } else {
            // Otherwise, create a new entry with the entry time
            const newVisit = new LibraryVisit({
                username: username,
                visit_date: currentDate,
                entry_time: currentTime
            });
            await newVisit.save();
            return res.send('Entry time logged successfully.'); // Send success message
        }
    } catch (error) {
        console.error('Error logging visit:', error);
        res.status(500).send('An error occurred while logging the visit.'); // Send error message
    }
});





// Helper function to calculate time difference in HH:MM:SS
function calculateTimeDifference(startTime, endTime) {
    const start = new Date(`1970-01-01T${startTime}Z`);
    const end = new Date(`1970-01-01T${endTime}Z`);
    const diff = new Date(end - start);
    return `${String(diff.getUTCHours()).padStart(2, '0')}:${String(diff.getUTCMinutes()).padStart(2, '0')}:${String(diff.getUTCSeconds()).padStart(2, '0')}`;
}
// Route to view all library visits with user details
app.get('/view-library-visits', async (req, res) => {
    try {
        // Fetch all library visits
        const allVisits = await LibraryVisit.find().sort({ visit_date: -1 });

        // Fetch user details based on usernames from library visits
        const visitsWithDetails = await Promise.all(allVisits.map(async (visit) => {
            const member = await StudentFaculty.findOne({ username: visit.username });
            return {
                ...visit.toObject(), // Convert Mongoose document to plain object
                member: member || null // Attach user details or null if not found
            };
        }));

        res.render('view-library-visits', { visitsWithDetails }); // Render the EJS template with the visits data
    } catch (error) {
        console.error("Error fetching library visits:", error);
        res.status(500).send("Internal server error");
    }
});

const issuedBookSchema = new mongoose.Schema({
    issuedId: {
        type: String,
        required: true,
        unique: true,
        validate: {
            validator: function(v) {
                return /^[A-Za-z0-9]{6}$/.test(v); // Validate for 6 alphanumeric characters
            },
            message: props => `${props.value} is not a valid 6 character alphanumeric ID!`
        }
    },
    username: { type: String, required: true },
    bookId: { type: String, required: true },
    issuedDate: { type: Date, default: Date.now },
    returnLimitDate: { type: Date },
    returnDate: { type: Date },
    fine: { type: Number, default: 0 },
    status: { type: String, default: 'Issued' }
});

// Create Issued Book model
const IssuedBook = mongoose.model('IssuedBook', issuedBookSchema);
module.exports = IssuedBook;







app.post('/issue-book', async (req, res) => {
    const { username, bookid, issuedId } = req.body;

    try {
        // Check if the user exists
        const userExists = await StudentFaculty.findOne({ username });
        if (!userExists) {
            return res.status(400).send('Invalid username');
        }

        // Check if the book exists
        const bookExists = await Book.findOne({ book_id: bookid });
        if (!bookExists) {
            return res.status(404).send('Book not found');
        }

        // Check if the user is returning the book
        const existingIssuedBook = await IssuedBook.findOne({ username, bookId: bookid, returnDate: null });
        if (existingIssuedBook) {
            // Calculate fine if returning late
            const returnLimitDate = existingIssuedBook.returnLimitDate;
            const currentDate = new Date();
            let fine = 0;

            if (currentDate > returnLimitDate) {
                const daysLate = Math.floor((currentDate - returnLimitDate) / (1000 * 60 * 60 * 24));
                fine = daysLate * 5; // Assuming fine of $5 per day late
            }

            // Update book status to "Returned"
            existingIssuedBook.returnDate = currentDate;
            existingIssuedBook.fine = fine;
            existingIssuedBook.status = "Returned";
            await existingIssuedBook.save();

            // Increment the book's availability
            bookExists.availability += 1;
            await bookExists.save();

          // Display fine amount if applicable
          res.send(`Book returned successfully!${fine > 0 ? ` Fine amount: $${fine}` : ''}`);
            return;
        }

        // Check if the user has any other active issued book
        const activeBooks = await IssuedBook.findOne({ username, status: { $in: ['Issued', 'Damaged'] } });
        if (activeBooks) {
            return res.status(400).send(`Cannot issue new book. Current status of previously issued book: ${activeBooks.status}`);
        }

        // Check if there are available copies of the book
        if (bookExists.availability <= 0) {
            return res.status(400).send('No copies available for this book');
        }

        // Calculate the return limit date (10 days from issue date)
        const returnLimitDate = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);

        // Issue the book
        const issuedBook = new IssuedBook({
            issuedId: issuedId || generateIssuedId(), // Use provided issuedId or generate a new one
            username,
            bookId: bookExists.book_id,
            issuedDate: new Date(),
            returnLimitDate: returnLimitDate,
            status: 'Issued'
        });

        // Save the issued book details
        await issuedBook.save();

        // Decrement the book's availability
        bookExists.availability -= 1;
        await bookExists.save();

        res.send('Book issued successfully!');

    } catch (error) {
        console.error('Error issuing or returning book:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Function to generate a random 6-character alphanumeric ID
function generateIssuedId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase(); // Generate a random 6-character ID
}
















// Route to view all issued books
app.get('/view-issued-books', async (req, res) => {
    try {
        const issuedBooks = await IssuedBook.find();
        res.render('view-issued-books', { issuedBooks });
    } catch (error) {
        console.error('Error fetching issued books:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Route for updating book status
app.post('/update-status', async (req, res) => {
    const { issuedId, status } = req.body;

    try {
        // Find the issued book record by issuedId
        const issuedBook = await IssuedBook.findOne({ issuedId });
        if (!issuedBook) {
            return res.status(404).send('Issued book not found');
        }

        // Update the status
        issuedBook.status = status;

        // If the book is returned, set the return date
        if (status === 'Returned') {
            issuedBook.returnDate = new Date();
        } else if (status === 'Damaged') {
            issuedBook.returnDate = null; // Optionally reset returnDate if damaged
        }

        // Save the updated issued book details
        await issuedBook.save();

        res.send('Status updated successfully');
    } catch (error) {
        console.error('Error updating status:', error);
        res.status(500).send('Internal Server Error');
    }
});


module.exports = router;
// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
