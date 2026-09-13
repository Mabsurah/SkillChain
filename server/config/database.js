const { execSync } = require("child_process");
require("dotenv").config();

let isConnected = false;
let dbInfo = {
  version: "Oracle Database 11g Express Edition",
  user: process.env.DB_USER || "SKILLCHAIN",
  connectString: process.env.DB_CONNECT_STRING || "localhost:1521/XE"
};

const user = process.env.DB_USER || "SKILLCHAIN";
const password = process.env.DB_PASSWORD || "Skillchain123";
const connStr = process.env.DB_CONNECT_STRING || "localhost:1521/XE";

async function connectDatabase() {
  try {
    const connectAuth = `${user}/${password}@${connStr}`;
    const testOutput = execSync(`sqlplus -S ${connectAuth}`, {
      input: "SET PAGESIZE 0 FEEDBACK OFF;\nSELECT 'CONNECTED_OK' FROM dual;\nEXIT;\n",
      encoding: "utf8",
      timeout: 5000
    });

    if (testOutput.includes("CONNECTED_OK")) {
      isConnected = true;
      console.log(`[Oracle DB] Connected successfully to Oracle Database (${connStr}) as ${user}`);
      return true;
    } else {
      throw new Error(testOutput.trim());
    }
  } catch (error) {
    console.warn(`[Oracle DB] Live Oracle DB not reached at ${connStr}. Operating in resilient Fallback/Simulation Mode.`);
    console.warn(`[Oracle DB Error Note]: ${error.message}`);
    isConnected = false;
    return false;
  }
}

async function executeOracle(sql, binds = {}, options = {}) {
  const startTime = Date.now();

  try {
    let processedSql = (sql || "").trim();
    
    // Replace named bind parameters :key with values
    for (const [key, val] of Object.entries(binds)) {
      if (val === null || val === undefined) {
        processedSql = processedSql.replace(new RegExp(`':${key}'\\b`, "gi"), () => "NULL");
        processedSql = processedSql.replace(new RegExp(`:${key}\\b`, "gi"), () => "NULL");
      } else if (typeof val === "number") {
        processedSql = processedSql.replace(new RegExp(`':${key}'\\b`, "gi"), () => String(val));
        processedSql = processedSql.replace(new RegExp(`:${key}\\b`, "gi"), () => String(val));
      } else {
        const escaped = String(val).replace(/'/g, "''");
        processedSql = processedSql.replace(new RegExp(`':${key}'\\b`, "gi"), () => `'${escaped}'`);
        processedSql = processedSql.replace(new RegExp(`:${key}\\b`, "gi"), () => `'${escaped}'`);
      }
    }

    const isSelect = /^\s*SELECT\b/i.test(processedSql);
    const isPlSql = /^\s*(DECLARE|BEGIN|EXEC|CREATE(\s+OR\s+REPLACE)?\s+(PROCEDURE|FUNCTION|TRIGGER|PACKAGE|TYPE))\b/i.test(processedSql) || /\bEND\s*;\s*$/i.test(processedSql);
    const delimiter = "~~~COLSEP~~~";

    let script = "";
    if (isSelect) {
      const cleanSelect = processedSql.replace(/;+$/, "");
      script = `
SET PAGESIZE 50000
SET FEEDBACK OFF
SET LINESIZE 32767
SET TRIMSPOOL ON
SET TAB OFF
SET HEADING ON
SET UNDERLINE OFF
SET DEFINE OFF
SET COLSEP "${delimiter}"
${cleanSelect};
EXIT;
`;
    } else {
      let block = processedSql;
      if (isPlSql) {
        block = block.replace(/;+$/, ";");
        if (!block.trim().endsWith("/")) {
          block = block + "\n/";
        }
      } else {
        if (!block.trim().endsWith(";")) {
          block = block + ";";
        }
      }

      script = `
SET PAGESIZE 50000
SET FEEDBACK OFF
SET SERVEROUTPUT ON SIZE UNLIMITED
SET LINESIZE 32767
SET TRIMSPOOL ON
SET AUTOCOMMIT ON
SET DEFINE OFF
${block}
COMMIT;
EXIT;
`;
    }

    const connectAuth = `${user}/${password}@${connStr}`;
    const rawOutput = execSync(`sqlplus -S ${connectAuth}`, {
      input: script,
      encoding: "utf8",
      timeout: 15000
    });

    // Check for Oracle error
    if (/ORA-\d{5}:/i.test(rawOutput)) {
      const errMatch = rawOutput.match(/ORA-\d{5}:[^\r\n]+/i);
      const errMsg = errMatch ? errMatch[0] : rawOutput.trim();
      const err = new Error(errMsg);
      err.rawOutput = rawOutput;
      throw err;
    }

    if (isSelect) {
      const lines = rawOutput.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length === 0) {
        return { success: true, source: "ORACLE_LIVE", data: [], executionTimeMs: Date.now() - startTime };
      }

      const headers = lines[0].split(delimiter).map(h => h.trim());
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(delimiter);
        if (parts.length === headers.length) {
          const row = {};
          headers.forEach((h, idx) => {
            let val = (parts[idx] || "").trim();
            if (/^-?\d+(\.\d+)?$/.test(val) && !h.toLowerCase().includes("phone") && !h.toLowerCase().includes("id") && !h.toLowerCase().includes("code")) {
              val = Number(val);
            }
            row[h] = val;
          });
          rows.push(row);
        }
      }

      isConnected = true;
      return {
        success: true,
        source: "ORACLE_LIVE",
        data: rows,
        executionTimeMs: Date.now() - startTime
      };
    } else {
      isConnected = true;
      return {
        success: true,
        source: "ORACLE_LIVE",
        output: rawOutput.trim(),
        executionTimeMs: Date.now() - startTime
      };
    }
  } catch (err) {
    console.error("[Oracle DB Query Error]:", err.message);
    throw err;
  }
}

function getDatabaseStatus() {
  return {
    connected: isConnected,
    user: user,
    connectString: connStr,
    version: dbInfo.version,
    status: isConnected ? "ONLINE (ORACLE LIVE)" : "SIMULATION / FALLBACK"
  };
}

module.exports = {
  connectDatabase,
  executeOracle,
  getDatabaseStatus
};