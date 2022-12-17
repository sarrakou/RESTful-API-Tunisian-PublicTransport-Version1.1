const express = require('express');
const session = require("express-session");


const jwt = require('jsonwebtoken');
const {v4:uuidv4} = require("uuid");
const bodyparser = require("body-parser");

const router = require('./router');
const app = express();
const pool = require("./db");
const path = require("path");

app.use(express.json()); //express.json is the middleware
app.use(express.static(path.join(__dirname, "public") ) );

app.set('views', './views');
app.set('view engine','ejs');

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended:true}));

app.use(session({
    secret: uuidv4(), // to generate a uuid to make the session unique
    resave: false,
    saveUninitialized:true
}));

app.use('/route',router);

//the base
app.get("/", (req,res) => {
 res.render('base');
});



//signup page
app.get("/signup", (req,res) => {
    res.render('signup');
});

//login page
app.get("/login", (req,res) => {
    res.render('login');
});

//LOGIN (get a token)
app.get('/auth', async (req,res) => {
    //get user
    const{username,password} = req.body;
    try {
        const verify = await pool.query("SELECT * FROM users WHERE username = $1",[username]);
        if (verify.rows.length == 0){
            res.json("this is no user with the username "+username);
        }
        else {
            if (password == verify.rows[0].pw){
                const user ={
                    username : username,
                    pw : password
                } 
                const token = jwt.sign({user}, 'secretkey', { expiresIn: '1200s'});
                res.json({
                    token:token
                });  
            }
            else {
                res.json("password for user "+username+" INCORRECT");
            }
        }
    } catch (err) {
        console.error(err.message);
    }
});

//REGISTER 
app.post('/register', async (req,res) => {
    const{username,password} = req.body;
    try { 
        const register = await pool.query("INSERT INTO users(username,pw) VALUES($1,$2)",[username,password]);
        res.json("User "+username+" added successfully.");
    } catch (err) {
        console.error(err.message);
    }
});

//get all busses
app.get('/busses',verifyToken, async (req,res) => {
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err){
            res.sendStatus(403);
        } else {
            try {
                const allbusses = await pool.query("SELECT * FROM bus_lignes");
                res.json(allbusses.rows);
            } catch(err) {
                console.error(err.message);
            } 
        }
    });
    
});
    

//get a bus
app.get('/busses/:station_name',verifyToken, async (req,res) => {
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err){
            res.sendStatus(403);
        } else {
    const{station_name} = req.params; 
    try {
        const bus = await pool.query("SELECT * FROM bus_lignes WHERE nom_station = $1 ",[station_name]);
        if (bus.rows.length == 0) {
            res.json("this bus line does not exist");
            } else {
            res.json(bus.rows[0]); 
                }
        } catch(err) {
        console.error(err.message);
            }
        } 
   
    });
}); 


//create 
app.post('/busses',verifyToken, async (req,res) => {
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err){
            res.sendStatus(403);
        } else {
        try {
            const{ n_de_ligne,n_de_station ,nom_station} = req.body;
            const newbus = await pool.query("INSERT INTO bus_lignes ( n_de_ligne,n_de_station ,nom_station)"+
            "values($1,$2,$3) RETURNING * ", [n_de_ligne,n_de_station,nom_station]);
                res.json(newbus.rows[0]);
        } catch(err) {
            console.error(err.message);
            }
        }
    });
}); 


//update
app.put('/busses/:station_name',verifyToken, async (req,res) => {
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err){
            res.sendStatus(403);
        } else {
            try {
                const {station_name} = req.params;
                const{n_de_ligne,n_de_station} = req.body;
                const bus = await pool.query("SELECT * FROM bus_lignes WHERE nom_station = $1 ",[station_name]);
                if (bus.rows.length == 0) {
                    res.json("this bus line does not exist");
                } else {
                try {
                const update_bus = await pool.query("UPDATE bus_lignes SET n_de_ligne = $1,n_de_station = $2"+ 
                "WHERE nom_station = $3  ",[n_de_ligne,n_de_station,station_name]);
                res.json("the bus line was successfully updated!");
            } catch(err) {
                console.error(err.message);
            }
        }
        } catch(err) {
            console.error(err.message);}
        }
            });

        });



//delete
app.delete('/busses/:station_name',verifyToken, async (req,res) => {
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err){
            res.sendStatus(403);
        } else {
            try {
                const {station_name} = req.params;
                const bus = await pool.query("SELECT * FROM bus_lignes WHERE nom_station = $1 ",[station_name]);
                if (bus.rows.length == 0) {
                    res.json("this bus line does not exist");
                } else {
                try {
                const delete_bus = await pool.query("DELETE FROM bus_lignes WHERE nom_station = $1 ",[station_name]);
                res.json(" the bus line was successfully deleted!");
            } catch(err) {
                console.error(err.message);
            }
        }
        } catch(err) {
            console.error(err.message);}
        }
            });

        });

//MAIN FUNCTION OF THE API

app.get('/busses/:departure_station/:destination_station',verifyToken, async (req,res) => {
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err){
            res.sendStatus(403);
        } else {
            const{departure_station} = req.params; 
            const{destination_station} = req.params;
            try {
                const departure = await pool.query("SELECT n_de_ligne,n_de_station FROM bus_lignes WHERE nom_station = $1 ",
                [departure_station]);
                const arrival = await pool.query("SELECT n_de_ligne,n_de_station FROM bus_lignes WHERE nom_station = $1 ",
                [destination_station]);
                if (departure.rows.length == 0 || arrival.rows.length == 0) {
                    res.json("there is no bus station in your current location.");
                } else {
                    if ( (departure.rows[0].n_de_ligne == arrival.rows[0].n_de_ligne) && (departure.rows[0].n_de_station <
                         arrival.rows[0].n_de_station) )  {
                        res.json("You should take the bus number "+departure.rows[0].n_de_ligne+" in the station number "+
                        departure.rows[0].n_de_station+": "
                        +departure_station+". The bus number "+arrival.rows[0].n_de_ligne+" stops in the station number "+
                        arrival.rows[0].n_de_station+": "+
                        destination_station+". Have a safe ride!"); 
                } 
                else {
                    s=0;
                    p =[];
                    for(let i = 1; i<departure.rowCount; i++){
                        for(let j=1;j<arrival.rowCount;j++){
                        if ( (departure.rows[i].n_de_ligne == arrival.rows[j].n_de_ligne) && (departure.rows[i].n_de_station < arrival.rows[j].n_de_station) ) {
                            res.json("You should take the bus number "+departure.rows[i].n_de_ligne+" in the station number "+departure.rows[i].n_de_station+": "+
                            departure_station+". The bus number "+arrival.rows[j].n_de_ligne+" stops in the station number "+arrival.rows[j].n_de_station+": "+
                            destination_station+". Have a safe ride!");
                        }
                        else {
                            s++;
                            }
                        }
                    }
                    if (s == (departure.rowCount-1)*(arrival.rowCount-1)){
                        res.json("There is no bus available to take you to your destination.");
                    }
                }  

                    
                }
            } catch(err) {
                console.error(err.message);
            } 
        }
        
        }); 
    }); 

//FORMAT OF TOKEN
//authorization: jwt <access_token> 


//verify token
function verifyToken(req, res, next){
    //get auth header value 
    const bearerHeader = req.headers['authorization'];
    //check if bearer is undefined 
    if (typeof bearerHeader !== 'undefined'){
        //split at the space
        const bearer = bearerHeader.split(' ');
        //get token from array 
        const bearerToken = bearer[1];
        // set the token
        req.token = bearerToken;
        // next middleware
        next(); 
    } else {
        //forbidden
        res.sendStatus(403);
    }

}

const port = process.env.PORT || 3000; // to use the environment variable port if the user has one otherwise use 3000
app.listen(port, () => console.log(`listening on port ${port}..`));

