const mysql = require('mysql');

const conn = mysql.createConnection({
    host: 'codd.cs.gsu.edu',
    user: 'ndeveau1',
    password: 'ndeveau1',
    database: 'ndeveau1',
    port: 3306
});

conn.connect(function(err) {
    if (err) console.log('Could not connect to MySQL', err);
    else console.log('Database connection established');
});

module.exports = conn;