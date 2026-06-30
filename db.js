const {Pool} = require('pg');
require('dotenv').config();

const pool = new Pool({
    user : process.env.DB_USER,
    password : process.env.DB_PASSWORD,
    host : process.env.DB_HOST || '127.0.0.1',
    port : parseInt(process.env.DB_PORT) || 5432,
    database : process.env.DB_DATABASE,
});

pool.connect((err, client, release) =>{
    if(err){
        return console.error('Database connection failure', err.message);
    }
    console.log('Postgre Sql connected successfully');
    release();
})
module.exports = pool;