const Pool = require("pg").Pool;

const pool = new Pool({
    user: "xwnxumoi",
    password : "AjMBCYzR9HQjH4NF3IvB2P7QuZjT3Mw1",
    database: "xwnxumoi",
    host: "castor.db.elephantsql.com",
    port:5432
}); 

module.exports = pool; 