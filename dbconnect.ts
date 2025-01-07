import mysql from "mysql";
import util from "util";

export const conn = mysql.createPool(
    {
        connectionLimit: 10,
        host: "202.28.34.197",
        user: "web66_65011212118",
        password: "65011212118@csmsu",
        database: "web66_65011212118",
    }
);

export const queryAsync = util.promisify(conn.query).bind(conn);

// export const conn = mysql.createPool(
//     {
//         connectionLimit: 10,
//         host: "mysql-view123.alwaysdata.net",
//         user: "view123",
//         password: "0955253793",
//         database: "view123_lotto",
//     }
// );

// export const queryAsync = util.promisify(conn.query).bind(conn);