const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const {check, validationResult} = require('express-validator');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/final8020', {
    useNewUrlParser: true
});

const Order = mongoose.model('Order',{
    name: String,
    phone: String,
    mangoJuices: Number,
    berryJuices: Number,
    appleJuices: Number
} );

const Admin = mongoose.model('Admin', {
    uname: String,
    pass: String
});

var myApp = express();

//---------------- Do not modify anything above this --------------------------

myApp.set('views', path.join(__dirname, 'views'));
myApp.use(express.static(__dirname+'/public'));
myApp.set('view engine', 'ejs');
myApp.use(session({
    secret: 'mysecret',
    resave: true,
    saveUninitialized: true
}));
myApp.use(bodyParser.urlencoded({ extended:false }));
myApp.use(bodyParser.json());

//------------- Use this space only for your routes ---------------------------


myApp.get('/',function(req, res){
    res.redirect('orderjuices');
});

myApp.get('/orderjuices',function(req, res){
    res.render('orderjuices');
});

myApp.post('/orderjuices', [
    check('name', 'Please enter your name').not().isEmpty(),
    check('phone', 'Please enter your phone').matches(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/),
    check('mangojuices').custom((value, {req}) => {
        if (!validOrderedItems(req.body.mango, req.body.apple, req.body.berry))
        {
            throw new Error('Please enter valid product order.');
        }
        return true;
    })
], function(req, res){
    const errors = validationResult(req);
    if(!errors.isEmpty())
    {
        var errorsData = {
            errors: errors.array()
        };      
        res.render('orderjuices', {errorsData});
    }
    else
    {
        var name = req.body.name;
        var phone = req.body.phone;
        var mango = req.body.mango;
        var apple = req.body.apple;
        var berry = req.body.berry;
        var subTotal = 0;
        var tax = 0;
        var total = 0;

        var order = new Order({
            name: name,
            phone: phone,
            mangoJuices: mango,
            appleJuices: apple,
            berryJuices: berry
        });
        order.save().then( ()=>{
            console.log('Order Created');
        });

        if (typeof(mango) !== undefined)
        {
            mango = mango * 299;
            mango = mango / 100;
        }
        if (typeof(apple) !== undefined)
        {
            apple = apple * 249;
            apple = apple / 100;
        }
        if (typeof(berry) !== undefined)
        {
            berry = berry * 199;
            berry = berry / 100;
        }

        subTotal = mango + apple + berry;
        tax = subTotal * 0.13;
        total = subTotal + tax;

        

        var input = {
            name: name,
            phone: phone,
            mango: mango,
            apple: apple,
            berry: berry,
            subTotal: subTotal.toFixed(2),
            tax: tax.toFixed(2),
            total: total.toFixed(2)
        };

        res.render('ordercomplete', input);
    }
});

myApp.get('/login',function(req, res){
    res.render('login');
});

myApp.post('/login', [
    check('username', 'Please enter your username').not().isEmpty(),
    check('password', 'Please enter your password').not().isEmpty(),
], function(req, res){
    var user = req.body.username;
    const errors = validationResult(req);
    if(!errors.isEmpty())
    {
        var errorsData = {
            errors: errors.array()
        };      
        res.render('login', {errorsData});
    }
    else
    {
        var pass = req.body.password;
        Admin.findOne({uname:user, pass:pass}).exec(function(err, foundUser)
        {
            if (err || foundUser == null)
            {
                var error = { msg: 'Username or password incorrect'};
                var errors = [];
                errors.push(error);
                var errorsData = { errors: errors };
                res.render('login', {errorsData, user});
            }
            else
            {
                req.session.username = foundUser.username;
                req.session.userLoggedIn = true;
                req.session.save(function(err){});
                res.redirect('vieworders');
            }            
        });
    }
});

myApp.get('/logout',function(req, res){
    if (req.session.userLoggedIn)
    {
        req.session.username = '';
        req.session.userLoggedIn = false;
        req.session.save(function(err){});
        res.render('logout');        
    }
    else
    {
        res.redirect('login');
    }
});

myApp.get('/vieworders',function(req, res){
    if (req.session.userLoggedIn){
        Order.find({}).exec(function(err, orders)
        {
            res.render('vieworders', {orders});
        });
    }
    else 
    {
        res.redirect('login');
    }
});

myApp.get('/delete/:id',function(req, res){
    if (req.session.userLoggedIn)
    {
        var id = req.params.id;
        Order.findOneAndDelete({_id:id}).exec(function(err, page){
            res.redirect('../deletecomplete');
        });
    }
    else
    {
        res.redirect('login');
    }
});

myApp.get('/deletecomplete',function(req, res){
    res.render('deletecomplete');
});



// write any other routes here as per your need


var regexForNumericInput = /^[0-9]+$/;
//function for validating numeric input
function validNumericInput(value)
{
    var validity = false;
    if (value && regexForNumericInput.test(value))
    {
        validity = true;
    }
    return validity;
}

//function for validating ordered items
function validOrderedItems(product1, product2, product3)
{
    var validity = false;
    if (product1 != 0 || product2 != 0 || product3 != 0)
    {
        if (validProduct(product1, product2, product3) ||
            validProduct(product2, product3, product1) ||
            validProduct(product3, product1, product2))
        {
            validity = true;
        }    
    }   
    return validity;
}

function validProduct(product1, product2, product3)
{
    var validity = false;
    if (validNumericInput(product1) && product1 > 0)
    {
        if ((!product2 || product2 == 0 || validNumericInput(product2) && (!product3 || product3 == 0 || validNumericInput(product3))))
        {
            validity = true;   
        }
    }
    return validity;
}



//---------------- Do not modify anything below this --------------------------
//------------------------ Setup the database ---------------------------------

myApp.get('/setup',function(req, res){
    
    let adminData = [{
        'uname': 'admin',
        'pass': 'admin'
    }];
    
    Admin.collection.insertMany(adminData);

    var firstNames = ['John ', 'Alana ', 'Jane ', 'Will ', 'Tom ', 'Leon ', 'Jack ', 'Kris ', 'Lenny ', 'Lucas '];
    var lastNames = ['May', 'Riley','Rees', 'Smith', 'Walker', 'Allen', 'Hill', 'Byrne', 'Murray', 'Perry'];

    let ordersData = [];

    for(i = 0; i < 10; i++){
        let tempName = firstNames[Math.floor((Math.random() * 10))] + lastNames[Math.floor((Math.random() * 10))];
        let tempOrder = {
            name: tempName,
            phone: Math.floor((Math.random() * 10000000000)),
            mangoJuices: Math.floor((Math.random() * 10)),
            berryJuices: Math.floor((Math.random() * 10)),
            appleJuices: Math.floor((Math.random() * 10))
        };
        ordersData.push(tempOrder);
    }
    
    Order.collection.insertMany(ordersData);
    res.send('Database setup complete. You can now proceed with your exam.');
    
});

//----------- Start the server -------------------

myApp.listen(process.env.PORT || 8080);
console.log('Server started at 8080 for mywebsite...');