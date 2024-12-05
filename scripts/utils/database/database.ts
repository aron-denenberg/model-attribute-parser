import { Client } from "pg";
import { getParameter } from "../secrets/secrets";

export class DatabaseUtils {
  static async getMonoDatabaseClient(port: number): Promise<Client> {
    const password = await getParameter('/operator/DB_PASSWORD');
    const user = await getParameter('/operator/DB_USERNAME');

    const client = new Client({
      host: 'localhost',
      database: 'postgres',
      port, 
      user,
      password
    });

    return client;
  }

  static getUpdateParams(table: string, data: any, id: string): { query: string, params: any[] } {
    const dataKeys = Object.keys(data);

    let params: string[] = [];

    let query = `UPDATE ${table} SET `;

    for (var i = 0; i < dataKeys.length; i++) {
      const dataKey = dataKeys[i];

      if (!dataKey) {
        continue;
      }

      const key = dataKey.replace(/([A-Z])/g, "_$1").toLowerCase();

      query += `${key} = $${i + 1}`;

      params.push(data[dataKey]);

      if (i < dataKeys.length - 1) {
        query += ', ';
      }
    }

    params.push(id);

    query += ` WHERE id = $${dataKeys.length + 1}`;
    query += ';';

    return {
      query,
      params
    };
  }
}