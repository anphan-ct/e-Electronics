const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "myshop"
});

db.connect(err => {
  if (err) {
    console.log("DB connection failed");
  } else {
    console.log("MySQL Connected");
  }
});

module.exports = db;