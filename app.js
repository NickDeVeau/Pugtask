const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const conn = require('./db');
const app = express();
const multer = require('multer');
const path = require('path');

app.set('view engine', 'pug');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Use a temporary filename
    }
});
const upload = multer({ storage });

app.use((req, res, next) => {
    res.locals.user = req.session.user;
    next();
});

app.get('/', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/landing');
    }
    conn.query('SELECT id, task, completed FROM tasks WHERE user_id = ?', [req.session.user.id], (err, results) => {
        if (err) {
            console.error('Database query failed', err);
            return res.status(500).send('Database query failed');
        }
        res.render('index', { tasks: results, user: req.session.user });
    });
});

app.get('/landing', (req, res) => {
    res.render('landing');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    conn.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword], (err, results) => {
        if (err) {
            console.error('Failed to register user', err);
            return res.status(500).render('error', { message: 'Failed to register user' });
        }
        res.redirect('/login');
    });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    conn.query('SELECT * FROM users WHERE username = ?', [username], async (err, results) => {
        if (err || results.length === 0) {
            console.error('Failed to login', err);
            return res.status(500).render('error', { message: 'Invalid credentials' });
        }
        const user = results[0];
        const match = await bcrypt.compare(password, user.password);
        if (match) {
            req.session.user = user;
            res.redirect('/');
        } else {
            res.status(401).render('error', { message: 'Invalid credentials' });
        }
    });
});

app.get('/profile', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('profile', { user: req.session.user });
});

app.post('/update-profile-picture', upload.single('profile-picture'), (req, res) => {
    if (!req.session.user) {
        return res.status(401).render('error', { message: 'Unauthorized' });
    }
    const profilePicture = `/uploads/${req.file.filename}`;
    conn.query('UPDATE users SET profile_picture = ? WHERE id = ?', [profilePicture, req.session.user.id], (err, results) => {
        if (err) {
            console.error('Failed to update profile picture', err);
            return res.status(500).render('error', { message: 'Failed to update profile picture' });
        }
        req.session.user.profile_picture = profilePicture;
        res.redirect('/profile');
    });
});

app.get('/settings', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('settings', { user: req.session.user });
});

app.post('/update-settings', (req, res) => {
    if (!req.session.user) {
        return res.status(401).render('error', { message: 'Unauthorized' });
    }
    const { email } = req.body;
    conn.query('UPDATE users SET email = ? WHERE id = ?', [email, req.session.user.id], (err, results) => {
        if (err) {
            console.error('Failed to update settings', err);
            return res.status(500).render('error', { message: 'Failed to update settings' });
        }
        req.session.user.email = email;
        res.redirect('/settings');
    });
});

app.post('/update-password', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).render('error', { message: 'Unauthorized' });
    }
    const { 'current-password': currentPassword, 'new-password': newPassword } = req.body;
    const user = req.session.user;

    // Verify current password
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
        return res.status(401).render('error', { message: 'Current password is incorrect' });
    }

    // Hash new password and update in database
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    conn.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id], (err, results) => {
        if (err) {
            console.error('Failed to update password', err);
            return res.status(500).render('error', { message: 'Failed to update password' });
        }
        res.redirect('/settings');
    });
});

app.get('/about', (req, res) => {
    res.render('about');
});

app.get('/contact', (req, res) => {
    res.render('contact');
});

app.post('/send-message', (req, res) => {
    const { name, email, message } = req.body;
    // Handle sending message logic here
    res.redirect('/contact');
});

app.get('/faq', (req, res) => {
    res.render('faq');
});

app.get('/terms', (req, res) => {
    res.render('terms');
});

app.get('/privacy', (req, res) => {
    res.render('privacy');
});

app.get('/contact', (req, res) => {
    res.render('contact');
});

app.get('/help', (req, res) => {
    res.render('help');
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/landing');
});

app.post('/add', (req, res) => {
    if (!req.session.user) {
        return res.status(401).render('error', { message: 'Unauthorized' });
    }
    const { task } = req.body;
    conn.query('INSERT INTO tasks (task, completed, user_id) VALUES (?, false, ?)', [task, req.session.user.id], (err, results) => {
        if (err) {
            console.error('Failed to add task', err);
            return res.status(500).render('error', { message: 'Failed to add task' });
        }
        res.redirect('/');
    });
});

app.post('/complete/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).render('error', { message: 'Unauthorized' });
    }
    const { id } = req.params;
    conn.query('UPDATE tasks SET completed = true WHERE id = ? AND user_id = ?', [id, req.session.user.id], (err, results) => {
        if (err) {
            console.error('Failed to complete task', err);
            return res.status(500).render('error', { message: 'Failed to complete task' });
        }
        res.redirect('/');
    });
});

app.post('/delete/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).render('error', { message: 'Unauthorized' });
    }
    const { id } = req.params;
    conn.query('DELETE FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.user.id], (err, results) => {
        if (err) {
            console.error('Failed to delete task', err);
            return res.status(500).render('error', { message: 'Failed to delete task' });
        }
        res.redirect('/');
    });
});

app.get('/search', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    const searchQuery = req.query.search;
    conn.query('SELECT id, task, completed FROM tasks WHERE user_id = ? AND task LIKE ?', [req.session.user.id, `%${searchQuery}%`], (err, results) => {
        if (err) {
            console.error('Database query failed', err);
            return res.status(500).send('Database query failed');
        }
        res.render('index', { tasks: results, user: req.session.user });
    });
});

app.get('/edit/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).render('error', { message: 'Unauthorized' });
    }
    const { id } = req.params;
    conn.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [id, req.session.user.id], (err, results) => {
        if (err || results.length === 0) {
            console.error('Failed to retrieve task', err);
            return res.status(500).render('error', { message: 'Failed to retrieve task' });
        }
        res.render('edit', { task: results[0] });
    });
});

app.post('/edit/:id', (req, res) => {
    if (!req.session.user) {
        return res.status(401).render('error', { message: 'Unauthorized' });
    }
    const { id } = req.params;
    const { task } = req.body;
    conn.query('UPDATE tasks SET task = ? WHERE id = ? AND user_id = ?', [task, id, req.session.user.id], (err, results) => {
        if (err) {
            console.error('Failed to update task', err);
            return res.status(500).render('error', { message: 'Failed to update task' });
        }
        res.redirect('/');
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});