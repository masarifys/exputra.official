import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not configured');

const parsedUrl = new URL(databaseUrl);
const databaseName = parsedUrl.pathname.replace(/^\//, '');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupDirectory = path.resolve('backups');
const outputPath = path.join(backupDirectory, `database-before-package-limit-${timestamp}.sql`);

fs.mkdirSync(backupDirectory, { recursive: true });

const connection = await mysql.createConnection({
  host: parsedUrl.hostname,
  port: Number(parsedUrl.port || 3306),
  user: decodeURIComponent(parsedUrl.username),
  password: decodeURIComponent(parsedUrl.password),
  database: databaseName,
  ssl: parsedUrl.searchParams.get('sslaccept') === 'strict' ? {} : undefined,
  dateStrings: true,
});

const stream = fs.createWriteStream(outputPath, { encoding: 'utf8' });
stream.write(`-- Database backup created ${new Date().toISOString()}\n`);
stream.write('SET FOREIGN_KEY_CHECKS=0;\nSET SQL_MODE=\'NO_AUTO_VALUE_ON_ZERO\';\n\n');

try {
  const [tableRows] = await connection.query(
    'SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = \'BASE TABLE\' ORDER BY TABLE_NAME',
    [databaseName],
  );

  for (const tableRow of tableRows) {
    const tableName = tableRow.TABLE_NAME;
    const escapedTable = `\`${String(tableName).replace(/`/g, '``')}\``;
    const [createRows] = await connection.query(`SHOW CREATE TABLE ${escapedTable}`);
    const createSql = createRows[0]['Create Table'];

    stream.write(`-- Structure for ${escapedTable}\nDROP TABLE IF EXISTS ${escapedTable};\n${createSql};\n\n`);

    const [rows] = await connection.query(`SELECT * FROM ${escapedTable}`);
    if (rows.length === 0) continue;

    const columns = Object.keys(rows[0]);
    const columnSql = columns.map((column) => `\`${column.replace(/`/g, '``')}\``).join(', ');
    const batchSize = 250;

    for (let index = 0; index < rows.length; index += batchSize) {
      const valuesSql = rows.slice(index, index + batchSize).map((row) => {
        return `(${columns.map((column) => connection.escape(row[column])).join(', ')})`;
      }).join(',\n');
      stream.write(`INSERT INTO ${escapedTable} (${columnSql}) VALUES\n${valuesSql};\n`);
    }
    stream.write('\n');
  }

  stream.write('SET FOREIGN_KEY_CHECKS=1;\n');
} finally {
  stream.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  await connection.end();
}

console.log(outputPath);
