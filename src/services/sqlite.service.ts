/* eslint-disable @typescript-eslint/no-explicit-any */
import {BindingScope, injectable} from '@loopback/core';
import BetterSqlite from 'better-sqlite3';

@injectable({scope: BindingScope.SINGLETON})
export class SqliteService {
  private db: BetterSqlite.Database;
  constructor() {
    this.db = new BetterSqlite(process.env.SQLITE_FILE!, {fileMustExist: true});
    this.db.pragma('journal_mode = WAL');
  }

  public async execute(query: string, ...params: any[]): Promise<any[]> {
    return this.db.prepare(query).all(params);
  }
}
