import mysql from "mysql";
import util from "util";

// export const conn = mysql.createPool(
//     {
//         connectionLimit: 10,
//         host: "202.28.34.197",
//         user: "web66_65011212118",
//         password: "65011212118@csmsu",
//         database: "web66_65011212118",
//     }
// );

// export const queryAsync = util.promisify(conn.query).bind(conn);


export const conn = mysql.createPool(
    {
        connectionLimit: 10,
        host: "mysql-concertcloseiin.alwaysdata.net",
        user: "417187_",
        password: "Pro2003Con2025",
        database: "concertcloseiin__",
        waitForConnections: true,
        queueLimit: 0
    }
);

export const queryAsync = util.promisify(conn.query).bind(conn);