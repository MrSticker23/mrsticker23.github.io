const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const http = require('http');
const socketIO = require('socket.io');
const axios = require('axios'); // For sending HTTP requests

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Configuration
const secretKey = 'your_secret_key'; // Replace with a strong secret key
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1284256426650374294/4enxC0qTLRL0TCIRH-GTc80ui3spvS9T25196A48Cr_4H9ibz_d7HIDjbPDfAGuiiz1i'; // Your Discord webhook

// File paths
const DATABASE_FILE = path.join(__dirname, 'database.json');
const CHAT_MESSAGES_FILE = path.join(__dirname, 'chat_messages.json');

// Initialize session middleware
app.use(session({
    secret: secretKey,
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Use 'true' if using HTTPS
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // For serving static files

// Helper functions
const loadJSONFile = (filename) => {
    if (!fs.existsSync(filename)) return {};
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
};

const saveJSONFile = (filename, data) => {
    fs.writeFileSync(filename, JSON.stringify(data, null, 4), 'utf8');
};

const loadChatMessages = () => {
    if (!fs.existsSync(CHAT_MESSAGES_FILE)) return [];
    return JSON.parse(fs.readFileSync(CHAT_MESSAGES_FILE, 'utf8'));
};

const saveChatMessage = (message) => {
    const messages = loadChatMessages();
    messages.push(message);
    saveJSONFile(CHAT_MESSAGES_FILE, messages);
};

// Initialize pre-made codes
const PRE_MADE_CODES = [
    ['CODE1234', 'premium'], ['CODE5678', 'premium'], ['CODEABCD', 'premium'], ['CODEWXYZ', 'premium'],
    ['sigmaskibidi222', 'premium'], ['9GfhCGP', 'premium'], ['ktY7Yf', 'premium'], ['dgVcJqw', 'premium'],
    ['f8QFZn', 'premium'], ['vpnnxy', 'premium'], ['32G7Vqwp', 'premium'], ['8pdcWqc', 'premium'],
    ['rQS3zn', 'premium'], ['wUKk7C', 'premium'], ['tYRS7b7', 'premium'], ['B6VvE8', 'premium'],
    ['UNBAN1234', 'unban'], ['UNBAN5678', 'unban'], ['UNBANABCD', 'unban'], ['sugma', 'premium']
];

const initializeCodes = () => {
    const data = loadJSONFile(DATABASE_FILE);
    if (!data.codes) data.codes = {};

    PRE_MADE_CODES.forEach(([code, type]) => {
        if (!data.codes[code]) {
            data.codes[code] = { redeemed: false, type };
        }
    });

    saveJSONFile(DATABASE_FILE, data);
};

// User management functions
const getUser = (username) => {
    const data = loadJSONFile(DATABASE_FILE);
    return data.users ? data.users[username] : null;
};

const addUser = (username, hashedPassword) => {
    const data = loadJSONFile(DATABASE_FILE);
    if (!data.users) data.users = {};

    if (data.users[username]) return false; // User already exists
    data.users[username] = { password: hashedPassword, premium: false, ban: 0 };
    saveJSONFile(DATABASE_FILE, data);
    return true;
};

const validateUser = (username, hashedPassword) => {
    const user = getUser(username);
    return user && bcrypt.compareSync(hashedPassword, user.password);
};

const setPremiumStatus = (username, status) => {
    const data = loadJSONFile(DATABASE_FILE);
    if (data.users && data.users[username]) {
        data.users[username].premium = status;
        saveJSONFile(DATABASE_FILE, data);
    }
};

const redeemCode = (code, username) => {
    const data = loadJSONFile(DATABASE_FILE);
    if (data.codes && data.codes[code] && !data.codes[code].redeemed) {
        const codeType = data.codes[code].type;

        // Mark as redeemed
        data.codes[code].redeemed = true;
        saveJSONFile(DATABASE_FILE, data);

        // Unban or premium
        if (codeType === 'unban' && username) {
            if (isBanned(username)) {
                setBanStatus(username, 0);
                return true;
            }
            return false;
        }

        if (codeType === 'premium') {
            setPremiumStatus(username, true);
            return true;
        }
    }

    return false;
};

const isBanned = (username) => {
    const user = getUser(username);
    return user && user.ban === 1;
};

const setBanStatus = (username, banStatus) => {
    const data = loadJSONFile(DATABASE_FILE);
    if (data.users && data.users[username]) {
        data.users[username].ban = banStatus;
        saveJSONFile(DATABASE_FILE, data);
    }
};

// Routes
app.get('/', (req, res) => {
    if (req.session.username) {
        const user = getUser(req.session.username);
        if (isBanned(req.session.username)) {
            return res.sendFile(path.join(__dirname, 'views', 'banned.html'));
        }
        return res.sendFile(path.join(__dirname, 'views', 'index_logged_in.html'));
    }
    return res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    if (addUser(username, hashedPassword)) {
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    } else {
        req.flash('error', 'Username already exists.');
        res.redirect('/register');
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);

    if (validateUser(username, hashedPassword)) {
        if (isBanned(username)) {
            req.flash('error', 'Your account is banned. Please contact support.');
        } else {
            req.session.username = username;
            req.flash('success', 'Login successful!');
            return res.redirect('/');
        }
    } else {
        req.flash('error', 'Invalid username or password.');
    }

    res.redirect('/login');
});

app.post('/redemption', (req, res) => {
    if (!req.session.username) {
        req.flash('error', 'You must be logged in to redeem a code.');
        return res.redirect('/login');
    }

    const { code } = req.body;
    if (redeemCode(code, req.session.username)) {
        req.flash('success', 'Code redeemed successfully!');
    } else {
        req.flash('error', 'Invalid or already redeemed code.');
    }

    res.redirect('/');
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    req.flash('success', 'You have been logged out.');
    res.redirect('/');
});

// Discord Webhook
app.post('/send_message', async (req, res) => {
    const { message } = req.body;

    if (message) {
        try {
            await axios.post(DISCORD_WEBHOOK_URL, { content: message });
            req.flash('success', 'Message sent successfully!');
        } catch (err) {
            req.flash('error', 'Failed to send message.');
        }
    } else {
        req.flash('error', 'Message cannot be empty.');
    }

    res.redirect('/');
});

// Chat functionality with Socket.io
app.get('/chat', (req, res) => {
    if (!req.session.username) {
        req.flash('error', 'You must be logged in to access the chat room.');
        return res.redirect('/login');
    }

    const messages = loadChatMessages();
    res.render('chat', { messages });
});

io.on('connection', (socket) => {
    const username = socket.handshake.query.username;

    socket.on('message', (data) => {
        const chatMessage = { username, message: data.message };
        saveChatMessage(chatMessage);
        io.emit('message', chatMessage);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${username}`);
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
initializeCodes(); // Initialize pre-made codes

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
