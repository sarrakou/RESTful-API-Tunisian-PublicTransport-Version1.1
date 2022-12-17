var express = require("express");
var router = express.Router();
const pool = require("./db");
const jwt = require('jsonwebtoken');
var token = null;
var userr=null;
var pww = null;

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

router.post('/login', async (req,res) => {
    //get user
    const{username,password} = req.body;
    try {
        const verify = await pool.query("SELECT * FROM users WHERE username = $1",[username]);
        if (verify.rows.length == 0){
            res.json("this is no user with the username "+req.body.username);
        }
        else {
            if (req.body.password == verify.rows[0].pw){
                const user ={
                    username : username,
                    pw : password
                } 
                req.session.user = req.body.username;
                userr = req.session.user;
                pww = req.body.password;
                res.redirect('/route/dashboard');
                //res.end("login successfull");
                token = jwt.sign({user}, 'secretkey', { expiresIn: '1200s'});
                res.json({
                    token
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

router.post('/signup', async (req,res) => {
    const{username,password} = req.body;
    try {
        const register = await pool.query("INSERT INTO users(username,pw) VALUES($1,$2)",[username,password]);
        res.end("User "+username+" added successfully.");
    } catch (err) {
        console.error(err.message);
    }
});


router.get("/api", (req,res) =>{ 
    res.render('api',{token : token});
});

router.get("/base", (req,res) =>{
    res.render('base');
});

router.get("/dashboard", (req,res) => {
    if (req.session.user){
    res.render('dashboard',{user : req.session.user});
    } else{
        res.send("Unauthorized User")
    }
});


//get all busses
router.get('/busses',verifyToken, async (req,res) => {
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

//REGISTER 
router.post('/register', async (req,res) => {
    const{username,password} = req.body;
    try {
        const register = await pool.query("INSERT INTO users(username,pw) VALUES($1,$2)",[username,password]);
        res.json("User "+username+" added successfully.");
    } catch (err) {
        console.error(err.message);
    }
});


//get a bus
router.post('/busses/:station_name',verifyToken, async (req,res) => {
    const{station1} = req.body;
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err){
            res.sendStatus(403);
        } else {
    try {
        const bus = await pool.query("SELECT * FROM bus_lignes WHERE nom_station = $1 ",[station1]);
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
router.post('/busses',verifyToken, async (req,res) => {
    const{ station_name,station_number ,line_number} = req.body;
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err){
            res.sendStatus(403);
        } else {
        try {
            const newbus = await pool.query("INSERT INTO bus_lignes ( n_de_ligne,n_de_station ,nom_station) values($1,$2,$3) RETURNING * ", [line_number,station_number,station_name]);
                res.json(newbus.rows[0]);
        } catch(err) {
            console.error(err.message);
            }
        }
    });
});

//update
router.post('/update',verifyToken, async (req,res) => {
    const{stationnname,namelline,nbrst} = req.body;
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err){
            res.sendStatus(403);
        } else {
            try {
                
                const bus = await pool.query("SELECT * FROM bus_lignes WHERE nom_station = $1 ",[stationnname]);
                if (bus.rows.length == 0) {
                    res.json("this bus line does not exist");
                } else {
                try {
                const update_bus = await pool.query("UPDATE bus_lignes SET n_de_ligne = $1,n_de_station = $2 WHERE nom_station = $3  ",[namelline,nbrst,stationnname]);
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
router.post('/delete',verifyToken, async (req,res) => {
    const {deletename} = req.body;
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err){
            res.sendStatus(403);
        } else {
            try {
                const bus = await pool.query("SELECT * FROM bus_lignes WHERE nom_station = $1 ",[deletename]);
                if (bus.rows.length == 0) {
                    res.json("this bus line does not exist");
                } else {
                try {
                const delete_bus = await pool.query("DELETE FROM bus_lignes WHERE nom_station = $1 ",[deletename]);
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
router.post('/busses/departure_station/destination_station',verifyToken, async (req,res) => {
    const{departure,arrival} = req.body;
    jwt.verify(req.token, 'secretkey', async (err, authData) => {
        if(err){
            res.sendStatus(403);
        } else {
           
            try {
                const departures = await pool.query("SELECT n_de_ligne,n_de_station FROM bus_lignes WHERE nom_station = $1 ",[departure]);
                const arrivals = await pool.query("SELECT n_de_ligne,n_de_station FROM bus_lignes WHERE nom_station = $1 ",[arrival]);
                if (departures.rows.length == 0 || arrivals.rows.length == 0) {
                    res.json("there is no bus station in your current location.");
                } else {
                    if ( (departures.rows[0].n_de_ligne == arrivals.rows[0].n_de_ligne) && (departures.rows[0].n_de_station < arrivals.rows[0].n_de_station) )  {
                        res.json("You should take the bus number "+departures.rows[0].n_de_ligne+" in the station number "+departures.rows[0].n_de_station+": "+departure+". The bus number "+arrivals.rows[0].n_de_ligne+" stops in the station number "+arrivals.rows[0].n_de_station+": "+arrival+". Have a safe ride!"); 
                } 
                else {
                    s=0;
                    //res.json(departure);
                    //res.json(arrival);
                    p =[];
                    
                    for(let i = 1; i<departures.rowCount; i++){
                        for(let j=1;j<arrivals.rowCount;j++){
                        if ( (departures.rows[i].n_de_ligne == arrivals.rows[j].n_de_ligne) && (departures.rows[i].n_de_station < arrivals.rows[j].n_de_station) ) {
                            res.json("You should take the bus number "+departures.rows[i].n_de_ligne+" in the station number "+departures.rows[i].n_de_station+": "+departure+". The bus number "+arrivals.rows[j].n_de_ligne+" stops in the station number "+arrivals.rows[j].n_de_station+": "+arrival+". Have a safe ride!");
                        }
                        else {
                            s++;
                            }
                        }
                    } 
                    if (s == (departures.rowCount-1)*(arrivals.rowCount-1)){
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



//auth (get a token)
router.get('/authh', async (req,res) => {
    const user ={
        username : userr,
        pw : pww
    } 
                const token = jwt.sign({user}, 'secretkey', { expiresIn: '1200s'});
                res.json({
                    token:token
                });  
});

router.get('/authh2', async (req,res) => {
    const user ={
        username : userr,
        pw : pww
    } 
                const token = jwt.sign({user}, 'secretkey', { expiresIn: '1200s'});
                res.render('api',{token:token});  
});
module.exports=router;