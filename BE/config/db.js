const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "myshop",
  timezone: "+07:00"
});

db.connect(err => {
  if (err) {
    console.log("DB connection failed");
  } else {
    console.log("MySQL Connected");
  }
});

module.exports = db;