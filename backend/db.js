const { Pool } = require("pg");

const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "qrshopping",
    password: "12345678",
    port: 5432
});

pool.on("connect", () => {
    console.log("Connected to PostgreSQL");
});

pool.on("error", (error) => {
    console.error("PostgreSQL error:", error);
});

module.exports = pool;