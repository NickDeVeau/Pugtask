const mysql = require('mysql2');

const conn = mysql.createConnection({
    host: '127.0.0.1', // Use IPv4 loopback address
    user: 'root', // Use the root MySQL username
    password: '', // Use the root MySQL password
    port: 3306
});

conn.connect(function(err) {
    if (err) console.log('Could not connect to MySQL', err);
    else {
        console.log('Connected to MySQL');
        // Create database if it doesn't exist
        conn.query('CREATE DATABASE IF NOT EXISTS gsu', function(err, results) {
            if (err) console.log('Failed to create database', err);
            else {
                console.log('Database created or already exists');
                // Switch to the newly created database
                conn.changeUser({ database: 'gsu' }, function(err) {
                    if (err) console.log('Failed to switch database', err);
                    else {
                        console.log('Switched to database gsu');
                        // Create tables if they do not exist
                        const createUsersTable = `
                            CREATE TABLE IF NOT EXISTS users (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                username VARCHAR(255) NOT NULL,
                                email VARCHAR(255) NOT NULL,
                                password VARCHAR(255) NOT NULL,
                                profile_picture VARCHAR(255)
                            );
                        `;
                        const createTasksTable = `
                            CREATE TABLE IF NOT EXISTS tasks (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                task VARCHAR(255) NOT NULL,
                                completed BOOLEAN NOT NULL DEFAULT false,
                                user_id INT,
                                FOREIGN KEY (user_id) REFERENCES users(id)
                            );
                        `;
                        conn.query(createUsersTable, function(err, results) {
                            if (err) console.log('Failed to create users table', err);
                            else console.log('Users table created or already exists');
                        });
                        conn.query(createTasksTable, function(err, results) {
                            if (err) console.log('Failed to create tasks table', err);
                            else console.log('Tasks table created or already exists');
                        });
                    }
                });
            }
        });
    }
});

// Function to fetch data from the database
function fetchData(userId, callback) {
    const query = 'SELECT id, task, completed FROM tasks WHERE user_id = ?'; // Fetch data from tasks table for the specific user
    conn.query(query, [userId], function(err, results) {
        if (err) {
            console.error('Error executing query', err); // Log the error
            return callback(err);
        }
        callback(null, results);
    });
}

module.exports = { conn, fetchData };