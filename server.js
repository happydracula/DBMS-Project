//imports
const express = require("express");
var bodyParser = require("body-parser");
const md5 = require("md5"); //Password encryption(Same encryption function used in database)
const app = express();
const ejs = require("ejs"); //Framework to pass data from backend server to frontend
const mysql = require("mysql"); //MySql driver for NodeJS apps
const { query } = require("express");
app.set("view engine", "ejs");
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const port = 3000; //Server established on port 3000
//specifying connection to MySql ODBC for nodejs
const con = mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "password",
  database: "library",
});
//Establishing connection
con.connect(function (err) {
  if (err) {
    console.log(err);
  } else {
    console.log("connection established:" + con.threadId);
  }
});
//Root page redirects to login page
app.get("/", (req, res) => {
  res.redirect("/login");
});
//Login page get request
app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/pages/login.html");
});
//Login page post request checks if entered username and password matches with one
//of the users in the USERS relation
app.post("/login", (req, res) => {
  if (req.body.btn == "login") {
    username = req.body.username;
    password = md5(req.body.password);
    console.log(password);
    var q = "select User_ID,pass from users where User_ID=? and pass=?";
    var inserts = [username, password];
    sql = mysql.format(q, inserts);
    con.query(sql, function (err, result, fields) {
      if (err) {
        console.log(err);
      } else {
        if (result.length == 0) {
          res.redirect("/login");
          console.log("Fail");
        } else {
          if (result[0].User_ID == "admin") {
            res.redirect("/admin");
          } else {
            res.redirect("/users/" + username);
          }
          console.log("Pass");
        }
      }
    });
    console.log("Submitted");
  } else {
    res.redirect("/register");
  }
});
//Register page get request
app.get("/register", (req, res) => {
  res.sendFile(__dirname + "/pages//register.html");
});
//Register page post request adds new user into Users table
app.post("/register", (req, res) => {
  username = req.body.username;
  password = req.body.password;
  repassword = req.body.repassword;
  if (repassword != password) {
    res.redirect("/register");
  } else {
    var query = "insert into users(User_ID,pass) values(?,?)";
    var inserts = [username, md5(password)];
    sql = mysql.format(query, inserts);
    con.query(sql, function (err, result) {
      if (err) {
        console.log(err);
      }
      res.redirect("/login");
    });
  }
});
app.get("/users/:user", (req, res) => {
  var username = req.params.user;
  var filters = [];
  var books;
  con.query(
    "select * from books where Book_ID not in (select Book_ID from borrowed_books)",
    function (err, results, fields) {
      books = results;
      filters = [];
      res.render("user_available_books", {
        books: books,
        filters: filters,
        user: username,
      });
    }
  );
  app.post("/users/:user/borrow", (req, res) => {
    if (req.body.btn == "brw") {
      selected_IDs = req.body.select;

      if (typeof selected_IDs == "string") {
        var q = "insert into borrowed_books(Book_ID,User_ID) values(?)";

        bid = selected_IDs;
        var inserts = [bid, req.params.user];
        con.query(q, [inserts], function (err, result) {
          if (err) {
            console.log(err);
          }
        });
      } else if (selected_IDs.length > 1) {
        selected_IDs.forEach((bid) => {
          var q = "insert into borrowed_books(Book_ID,User_ID) values(?)";

          var inserts = [bid, req.params.user];
          con.query(q, [inserts], function (err, result) {
            if (err) {
              console.log(err);
            }
          });
        });
      }
      res.redirect("/users/" + req.params.user);
    } else {
      res.redirect("/users/" + req.params.user + "/borrowed_books");
    }
  });
  app.get("/users/:user/borrowed_books", (req, res) => {
    var q =
      "select * from books where Book_ID in (select Book_ID from borrowed_books where User_ID=?)";
    var inserts = [req.params.user];
    con.query(q, inserts, function (err, results, fields) {
      if (err) {
        console.log(err);
      } else {
        res.render("user_borrowed_books", {
          books: results,
          user: req.params.user,
        });
      }
    });
  });
  app.post("/users/:user/return", (req, res) => {
    if (req.body.btn == "rtn") {
      var q = "delete from borrowed_books where Book_ID=? and User_ID=?";
      var selected_IDs = req.body.select;
      if (selected_IDs) {
        if (typeof selected_IDs == "string") {
          var inserts = [selected_IDs, req.params.user];
          con.query(q, inserts, function (err, results) {
            if (err) {
              console.log(err);
            }
          });
        } else {
          selected_IDs.forEach(function (id) {
            var inserts = [id, req.params.user];
            con.query(q, inserts, function (err, results) {
              if (err) {
                console.log(err);
              }
            });
          });
        }
      }
      res.redirect("/users/" + req.params.user + "/borrowed_books");
    } else {
      res.redirect("/users/" + req.params.user);
    }
  });
  app.post("/users/:user/available_books/filtered", (req, res) => {
    title = req.body.title;
    author = req.body.author;
    publisher = req.body.publisher;
    rating = req.body.rating;
    var inserts = [];
    var q =
      "SELECT * FROM books where Book_ID not in (select Book_ID from borrowed_books) ";
    var filters = [];
    if (title.length >= 1 || author.length >= 1 || publisher.length >= 1) {
      q = q + "and ";
      if (title.length >= 1) {
        q = q + "Name=?";
        inserts.push(title);
        filters.push("Title:" + title);
      }
      if (author.length >= 1) {
        if (inserts.length >= 1) {
          q = q + " AND ";
        }
        q = q + "Author=?";
        inserts.push(author);
        filters.push("Author:" + author);
      }
      if (publisher.length >= 1) {
        if (inserts.length >= 1) {
          q = q + " AND ";
        }
        q = q + "Publisher=?";
        inserts.push(publisher);
        filters.push("Publisher:" + publisher);
      }
    }
    con.query(q, inserts, function (err, results, fields) {
      if (err) {
        console.log(err);
      } else {
        console.log(results);
        var books = results;
        res.render("user_available_books", {
          books: books,
          filters: filters,
          user: req.params.user,
        });
      }
    });
  });
});

//Admin page get request(Admin user enters his special credentials to access Admin page)
app.get("/admin", (req, res) => {
  res.sendFile(__dirname + "/pages//admin.html");
});
//Admin fills form to enter new book into books relation
app.post("/admin", (req, res) => {
  if (req.body.btn == "insert") {
    title = req.body.title;
    bid = req.body.bid;
    author = req.body.author;
    publisher = req.body.publisher;
    rating = req.body.rating;
    desc = req.body.desc;
    year = req.body.year;
    var q =
      "insert into books(Author,Book_ID,Name,Publisher,Rating,Short_Description,Year_Published) values ?";
    var insert = [
      [author, bid, title, publisher, parseInt(rating), desc, parseInt(year)],
    ];
    con.query(q, [insert], function (err, result) {
      if (err) {
        console.log(err);
      }
    });
    console.log(req.body);
  }
  res.redirect("/admin/available_books");
});
app.get("/admin/available_books", (req, res) => {
  var books;
  con.query(
    "SELECT * FROM books where Book_ID not in (select Book_ID from borrowed_books)",
    function (err, results, fields) {
      if (err) {
        console.log(err);
      }
      books = results;
      res.render("admin_available_books", {
        user: "admin",
        books: books,
        filters: [],
      });
    }
  );
});
app.post("/admin/available_books/filtered", (req, res) => {
  title = req.body.title;
  author = req.body.author;
  publisher = req.body.publisher;
  rating = req.body.rating;
  var inserts = [];
  var q = "select * from books  ";
  var filters = [];
  if (
    title.length >= 1 ||
    author.length >= 1 ||
    publisher.length >= 1 ||
    (rating >= 1 && rating <= 5)
  ) {
    q = q + " where ";
    if (title.length >= 1) {
      q = q + " Name=? ";
      inserts.push(title);
      filters.push("Title:" + title);
    }
    if (author.length >= 1) {
      if (inserts.length >= 1) {
        q = q + "and ";
      }
      q = q + " Author=? ";
      inserts.push(author);
      filters.push("Author:" + author);
    }
    if (publisher.length >= 1) {
      if (inserts.length >= 1) {
        q = q + "and ";
      }
      q = q + " Publisher=? ";
      inserts.push(publisher);
      filters.push("Publisher:" + publisher);
    }
    if (rating >= 1 && rating <= 5) {
      if (inserts.length >= 1) {
        q = q + "and ";
      }
      q = q + " Rating=? ";
      inserts.push(rating);
      filters.push("Rating:" + rating);
    }
  }
  q = q + " order by rating desc";
  con.query(q, inserts, function (err, results, fields) {
    if (err) {
      console.log(err);
    } else {
      console.log(results);
      var books = results;
      res.render("admin_available_books", { books: books, filters: filters });
    }
  });
  console.log(rating);
});
app.post("/admin/delete_books", (req, res) => {
  if (req.body.btn == "del") {
    selected_IDs = req.body.select;
    console.log(selected_IDs[0]);
    if (selected_IDs.length >= 1) {
      selected_IDs.forEach((bid) => {
        var q = "delete from books where Book_Id=?";
        var inserts = [bid];
        con.query(q, [inserts], function (err, result) {
          if (err) {
            console.log(err);
          }
        });
      });
    }
    res.redirect("/admin/available_books");
  } else {
    res.redirect("/admin");
  }
});
app.listen(port, () => {
  console.log("Server running on port:" + port);
});
