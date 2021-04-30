/***********************
 Load Components!

 Express      - A Node.js Framework
 Body-Parser  - A tool to help use parse the data in a post request
 Pg-Promise   - A database tool to help use connect to our PostgreSQL database
 ***********************/
var express = require('express'); //Ensure our express framework has been added
var app = express();
var bodyParser = require('body-parser'); //Ensure our body-parser tool has been added
app.use(bodyParser.json());              // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies

const axios = require('axios');
//Create Database Connection
var pgp = require('pg-promise')();

/**********************
 Database Connection information
 host: This defines the ip address of the server hosting our database.
 We'll be using `db` as this is the name of the postgres container in our
 docker-compose.yml file. Docker will translate this into the actual ip of the
 container for us (i.e. can't be access via the Internet).
 port: This defines what port we can expect to communicate to our database.  We'll use 5432 to talk with PostgreSQL
 database: This is the name of our specific database.  From our previous lab,
 we created the football_db database, which holds our football data tables
 user: This should be left as postgres, the default user account created when PostgreSQL was installed
 password: This the password for accessing the database. We set this in the
 docker-compose.yml for now, usually that'd be in a seperate file so you're not pushing your credentials to GitHub :).
 **********************/
const dev_dbConfig = {
    host: 'db',
    port: 5432,
    database: process.env.POSTGRES_DB,
    user:  process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD
};

/** If we're running in production mode (on heroku), the we use DATABASE_URL
 * to connect to Heroku Postgres.
 */
const isProduction = process.env.NODE_ENV === 'production';
const dbConfig = isProduction ? process.env.DATABASE_URL : dev_dbConfig;

// Heroku Postgres patch for v10
// fixes: https://github.com/vitaly-t/pg-promise/issues/711
if (isProduction) {
    pgp.pg.defaults.ssl = {rejectUnauthorized: false};
}

const db = pgp(dbConfig);

// set the view engine to ejs
app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');
app.use(express.static(__dirname + '/'));//This line is necessary for us to use relative paths and access our resources directory



/*********************************
 Below we'll add the get & post requests which will handle:
 - Database access
 - Parse parameters from get (URL) and post (data package)
 - Render Views - This will decide where the user will go after the get/post request has been processed

 Web Page Requests:

 Login Page:        Provided For your (can ignore this page)
 Registration Page: Provided For your (can ignore this page)
 Home Page:
 /home - get request (no parameters)
 This route will make a single query to the favorite_colors table to retrieve all of the rows of colors
 This data will be passed to the home view (pages/home)

 /home/pick_color - post request (color_message)
 This route will be used for reading in a post request from the user which provides the color message for the default color.
 We'll be "hard-coding" this to only work with the Default Color Button, which will pass in a color of #FFFFFF (white).
 The parameter, color_message, will tell us what message to display for our default color selection.
 This route will then render the home page's view (pages/home)

 /home/pick_color - get request (color)
 This route will read in a get request which provides the color (in hex) that the user has selected from the home page.
 Next, it will need to handle multiple postgres queries which will:
 1. Retrieve all of the color options from the favorite_colors table (same as /home)
 2. Retrieve the specific color message for the chosen color
 The results for these combined queries will then be passed to the home view (pages/home)

 /team_stats - get request (no parameters)
 This route will require no parameters.  It will require 3 postgres queries which will:
 1. Retrieve all of the football games in the Fall 2018 Season
 2. Count the number of winning games in the Fall 2018 Season
 3. Count the number of lossing games in the Fall 2018 Season
 The three query results will then be passed onto the team_stats view (pages/team_stats).
 The team_stats view will display all fo the football games for the season, show who won each game,
 and show the total number of wins/losses for the season.

 /player_info - get request (no parameters)
 This route will handle a single query to the football_players table which will retrieve the id & name for all of the football players.
 Next it will pass this result to the player_info view (pages/player_info), which will use the ids & names to populate the select tag for a form
 ************************************/

// login page
app.get('/', function(req, res) {
    res.render('pages/main',{
        my_title:"Main Page",
        mealData: null,
        mealName: ''
    });
});

app.get('/reviews', function(req, res) {
    var select_statement = "SELECT * FROM reviews;";
    db.task('post_review', task => {
        return task.batch([
            task.any(select_statement)
        ]);
    })
        .then(data => {
            //console.log(info);
            res.render('pages/reviews',{
                my_title: "Reviews",
                reviews:data[0]
            })
        })
        .catch(err => {
            console.log('error', err);
            res.render('pages/reviews', {
                my_title: 'Reviews Page',
                reviews: '',
                message: "Reviews doesn't exist"
            })
        });
})

app.post('/search', function(req, res) {
    let searchQuery = req.body.search;
    if(searchQuery) {
        axios({
            url: 'http://www.themealdb.com/api/json/v1/1/search.php?s=' + searchQuery,
            method: 'GET',
            dataType: 'json'
        })
            .then(items => {
                if(!items.data.meals) {
                    console.log("test")
                }
                res.json({status: 'success', message: 'search success'});
                res.render('pages/main', {
                    local_css:"style.css",
                    my_title:"Main Page",
                    mealData: items.data.meals[0],
                    mealName: items.data.meals[0].strMeal
                })
            })
            .catch(error => {
                if (error.response) {
                    console.log(error.response.data);
                    console.log(error.response.status);
                }
                res.render('pages/main', {
                    my_title: "Error",
                    local_css:"style.css",
                    mealData: null,
                    mealName: ''
                });
            })
    } else {
        res.render('pages/main',{
            local_css:"style.css",
            my_title:"Main Page",
            mealData: null,
            mealName: ''
        });
    }
});

app.post('/post_review', function(req, res) {
    var foodName = req.body.foodName;
    var foodReview = req.body.review;
    const date = (new Date()).toLocaleString("en-US")
    if(foodReview) {
        var insert_statement = "INSERT INTO reviews(food_name, review, review_date) VAlUES('" + foodName + "','" + foodReview + "','" + date + "') ON CONFLICT DO NOTHING;";
        var select_statement = "SELECT * FROM reviews;";

        db.task('post_review', task => {
            return task.batch([
                task.any(insert_statement),
                task.any(select_statement)
            ]);
        })
        .then(data => {
            //console.log(info);
            res.render('pages/reviews',{
                my_title: "Reviews",
                reviews:data[1]
            })
        })
        .catch(err => {
            console.log('error', err);
            res.render('pages/reviews', {
                my_title: 'Reviews Page',
                reviews: '',
                message: "Food doesn't exist"
            })
        });
    }
});

app.post('/filter', function(req, res) {
    var foodName = req.body.search;
    if(foodName) {
        var select_statement = "SELECT * FROM reviews WHERE food_name = '" + foodName + "';";

        db.task('post_review', task => {
            return task.batch([
                task.any(select_statement)
            ]);
        })
            .then(data => {
                res.render('pages/reviews',{
                    my_title: "Reviews",
                    reviews:data[0]
                })
            })
            .catch(err => {
                console.log('error', err);
                res.render('pages/reviews', {
                    my_title: 'Reviews Page',
                    reviews: '',
                    message: "Food doesn't exist"
                })
            });
    } else {
        res.redirect('/reviews');
    }
});

//app.listen(3000);
const server = app.listen(process.env.PORT || 3000, () => {
    console.log(`Express running → PORT ${server.address().port}`);
});