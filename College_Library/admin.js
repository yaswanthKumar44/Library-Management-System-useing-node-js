

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const app = express();
const session = require('express-session');
const flash = require('connect-flash');

// Middleware setup
app.use(session({
    secret: 'your-secret-key', // Replace with your own secret key
    resave: false,
    saveUninitialized: true
}));
app.use(flash());

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/Library')
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('Error connecting to MongoDB:', error));
   

// Middleware configurations
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'Admin'));

// Multer storage configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });
// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'Admin', 'index.html'));
});

// Admin Schema and Model
const adminSchema = new mongoose.Schema({
    username: String,
    password: String,
    name: String,
    email: String,
    mobile: String,
    profilePhoto: String,
});
const Admin = mongoose.model('Admin', adminSchema);

// Librarian Schema and Model
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

// Define a schema for the books collection
const bookSchema = new mongoose.Schema({
    book_id: { type: String, required: true, unique: true },
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

// Set up static file serving
app.use(express.static('public'));
// Route for adding a new book

// Route to handle book addition
app.post('/admin-add-book', upload.fields([
    { name: 'cover_image' },
    { name: 'preview_image_1' },
    { name: 'preview_image_2' },
    { name: 'preview_image_3' }
]), async (req, res) => {
    const {
        book_id,
        book_name,
        book_type,
        number_of_books,
        availability,
        author,
        edition,
        isbn,
        published_year
    } = req.body;

    // Get file paths for uploaded images
    const coverImagePath = req.files['cover_image'][0].path;
    const previewImage1Path = req.files['preview_image_1'][0].path;
    const previewImage2Path = req.files['preview_image_2'][0].path;
    const previewImage3Path = req.files['preview_image_3'][0].path;

    try {
        // Check if a book with the same book_id already exists
        const existingBook = await Book.findOne({ book_id });
        if (existingBook) {
            return res.status(400).json({ success: false, message: 'Book ID already exists in the library' });
        }

        // Create a new book document
        const newBook = new Book({
            book_id,
            book_name,
            book_type,
            number_of_books,
            availability,
            author,
            edition,
            cover_image: coverImagePath,
            preview_image_1: previewImage1Path,
            preview_image_2: previewImage2Path,
            preview_image_3: previewImage3Path,
            isbn,
            published_year
        });

        // Save the book to the database
        await newBook.save();
        console.log('Book added successfully!');
        res.status(200).json({ success: true, message: 'Book added successfully!' });

    } catch (err) {
        console.error('Error saving book:', err);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

// Admin Routes
app.get('/admin-register', (req, res) => res.sendFile(path.join(__dirname, 'Admin', 'admin-register.html')));
app.post('/admin-register', upload.single('profile_photo'), async (req, res) => {
    const { username, password, name, email, mobile } = req.body;
    const profilePhoto = `/uploads/${req.file.filename}`;

    if (await Admin.findOne({ username })) {
        return res.send('Admin already exists');
    }

    const newAdmin = new Admin({ username, password, name, email, mobile, profilePhoto });
    await newAdmin.save();
    res.redirect('/admin-login');
});

app.get('/admin-login', (req, res) => res.sendFile(path.join(__dirname, 'Admin', 'admin-login.html')));
app.post('/admin-login', async (req, res) => {
    const { username, password } = req.body;
    const admin = await Admin.findOne({ username, password });

    if (admin) {
        req.session.admin = admin;
        res.redirect('/admin-profile');
    } else {
        res.send('Invalid credentials');
    }
});

app.get('/admin-profile', (req, res) => {
    if (!req.session.admin) return res.redirect('/admin-login');
    res.render('admin-profile', { admin: req.session.admin });
});

app.get('/admin-home', (req, res) => {
    if (!req.session.admin) return res.redirect('/admin-login');
    res.render('admin-home', { admin: req.session.admin });
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.redirect('/admin-profile');
        res.redirect('/admin-login');
    });
});

app.post('/update-profile', upload.single('profile_photo'), async (req, res) => {
    if (!req.session.admin) return res.redirect('/admin-login');

    const { name, email, mobile } = req.body;
    const updateData = { name, email, mobile };
    if (req.file) updateData.profilePhoto = `/uploads/${req.file.filename}`;

    await Admin.findByIdAndUpdate(req.session.admin._id, updateData, { new: true });
    req.session.admin = await Admin.findById(req.session.admin._id);
    res.redirect('/admin-profile');
});

// Librarian Routes
app.get('/admin-add-librarian', (req, res) => {
    res.sendFile(path.join(__dirname, 'Admin', 'admin-add-librarian.html'));
});

app.post('/admin-add-librarian', upload.single('profile_photo'), async (req, res) => {
    try {
        const { name, username, email, mobile, password, qualification } = req.body;
        const profilePhoto = `/uploads/${req.file.filename}`;

        // Check for duplicate username or email
        const existingLibrarian = await Librarian.findOne({
            $or: [{ username: username }, { email: email }]
        });

        if (existingLibrarian) {
            if (existingLibrarian.username === username) {
                return res.redirect('/admin-add-librarian?error=Username already exists.');
            }
            if (existingLibrarian.email === email) {
                return res.redirect('/admin-add-librarian?error=Email already exists.');
            }
        }

        // Save new librarian
        const newLibrarian = new Librarian({ name, username, email, mobile, password, qualification, profilePhoto });
        await newLibrarian.save();

        // Success message
        res.redirect('/admin-add-librarian?success=Librarian added successfully!');
    } catch (error) {
        console.error("Error adding librarian:", error);
        res.redirect('/admin-add-librarian?error=Failed to add librarian.');
    }
});

// Admin view the librarians
app.get('/admin-view-librarians', async (req, res) => {
    try {
        const librarians = await Librarian.find();
        res.render('admin-view-librarians', { librarians });
    } catch (error) {
        console.error("Error fetching librarians:", error);
        res.status(500).send("Failed to fetch librarians.");
    }
});

// Edit Librarians
// Edit Librarians
app.get('/admin-delete-librarian/:id', async (req, res) => {
    try {
        const librarianId = req.params.id;
        const result = await Librarian.findByIdAndDelete(librarianId);

        if (!result) {
            return res.redirect('/admin-view-librarians?message=not-found');
        }

        res.redirect('/admin-view-librarians?message=deleted');
    } catch (error) {
        console.error(error);
        res.redirect('/admin-view-librarians?message=error');
    }
});

app.post('/admin-edit-librarian', upload.single('profilePhoto'), async (req, res) => {
    const { id, username, name, email, mobile, qualification, password } = req.body;
    const updateData = { username, name, email, mobile, qualification, password };

    if (req.file) {
        updateData.profilePhoto = `/uploads/${req.file.filename}`;
    }

    try {
        const updatedLibrarian = await Librarian.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedLibrarian) {
            return res.redirect('/admin-view-librarians?message=not-found');
        }

        res.redirect('/admin-view-librarians?message=updated');
    } catch (error) {
        console.error(error);
        res.redirect('/admin-view-librarians?message=error');
    }
});


app.get('/admin-add-books', (req, res) => {
    res.sendFile(path.join(__dirname, 'Admin', 'admin-add-books.html'));
});
// View all books
app.get('/admin-view-books', async (req, res) => {
    try {
        const books = await Book.find(); // Assuming Book is your model
        res.render('admin-view-books', { books });
    } catch (error) {
        console.error('Error fetching books:', error);
        res.status(500).send('Failed to fetch books.');
    }
});


// Route for searching books by type
app.get('/search-books', async (req, res) => {
    const bookType = req.query.book_type;

    try {
        const books = await Book.find({ book_type: bookType });
        res.render('admin-view-books', {books });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});


// Route for searching books by type
app.get('/search-books2', async (req, res) => {
    const bookName = req.query.book_name;

    try {
        const books = await Book.find({ book_name: bookName });
        res.render('admin-view-books', { books });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});
// Route for searching books by type
app.get('/search-books3', async (req, res) => {
    const bookId= req.query.book_id;

    try {
        const books = await Book.find({ book_id: bookId });
        res.render('admin-view-books', { books });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});
// Route for searching books by type
app.get('/search-books4', async (req, res) => {
    const bookAuthor= req.query.author;

    try {
        const books = await Book.find({ author : bookAuthor });
        res.render('admin-view-books', { books });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});




// Route to delete a book
app.get('/admin-delete-book/:id', async (req, res) => {
    const bookId = req.params.id;
    await Book.findByIdAndDelete(bookId);
    res.redirect('/admin-view-books');
});








// Route to display the edit book form
app.get('/admin-edit-book/:id', async (req, res) => {
    const bookId = req.params.id;
    const book = await Book.findById(bookId);
    res.render('admin-edit-book', { book });
});

// Route to handle edit book form submission
app.post('/admin-edit-book/:id', upload.fields([
    { name: 'cover_image', maxCount: 1 },
    { name: 'preview_image_1', maxCount: 1 },
    { name: 'preview_image_2', maxCount: 1 },
    { name: 'preview_image_3', maxCount: 1 }
]), async (req, res) => {
    const bookId = req.params.id;
    const {
        book_name,
        book_type,
        number_of_books,
        availability,
        author,
        edition,
        isbn,
        published_year
    } = req.body;

    const updatedData = {
        book_name,
        book_type,
        number_of_books,
        availability,
        author,
        edition,
        isbn,
        published_year,
    };

    if (req.files.cover_image) updatedData.cover_image = req.files.cover_image[0].path;
    if (req.files.preview_image_1) updatedData.preview_image_1 = req.files.preview_image_1[0].path;
    if (req.files.preview_image_2) updatedData.preview_image_2 = req.files.preview_image_2[0].path;
    if (req.files.preview_image_3) updatedData.preview_image_3 = req.files.preview_image_3[0].path;

    try {
        await Book.findByIdAndUpdate(bookId, updatedData);
        res.redirect('/admin-view-books');
    } catch (err) {
        console.error('Error updating book:', err);
        res.status(500).send('Server Error');
    }
});


































const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
