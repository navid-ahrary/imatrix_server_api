/* eslint-disable no-useless-catch */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {BindingScope, injectable} from '@loopback/core';
import Database, {default as BetterSqlite} from 'better-sqlite3';
import {exec} from 'child_process';
import _ from 'lodash';
import {v4 as uuidV4} from 'uuid';
import {ClientTraffics, Clients, Inbounds} from '../models';

const {TUNNEL_DOMAIN, TUNNEL_PORT, SQLITE_FILE, SERVER_NAME} = process.env;

interface Settings {
  clients: Clients[];
  decryption: string;
  fallbacks: [];
}

@injectable({scope: BindingScope.SINGLETON})
export class V2RayService {
  constructor() {}

  public async generate(clientName: string, trafficInGb: number): Promise<string> {
    try {
      const db = new BetterSqlite(SQLITE_FILE!, {fileMustExist: true});

      console.log(`Generating ${clientName} ...`);

      const clientId = uuidV4();
      const inboundName = `${SERVER_NAME}-H2`;
      const inbound = await this.findInbounds(inboundName);
      const traffic = Math.ceil(trafficInGb * Math.pow(2, 30));

      const settings = <Settings>JSON.parse(inbound.settings);

      settings.clients.push(
        new Clients({
          email: clientName,
          enable: true,
          expiryTime: 0,
          flow: '',
          id: clientId,
          limitIp: 0,
          subId: '',
          tgId: '',
          totalGB: traffic,
        }),
      );

      const r = db
        .prepare(
          `UPDATE inbounds
          SET settings = ?
          WHERE id = ?`,
        )
        .run(JSON.stringify(settings, null, 2), inbound.id);

      console.log('generating', r);

      const r2 = db
        .prepare(
          `INSERT INTO client_traffics
          (inbound_id, enable, email, up, down, expiry_time, total)
          VALUES (?, 1, ?, 0, 0, 0, ?)`,
        )
        .run(inbound.id, clientName, traffic);

      console.log('generating', r2);

      db.close();

      await this.restartXUI();

      return `vless://${clientId}@${TUNNEL_DOMAIN}:${TUNNEL_PORT}?type=http&path=%2Ffmi4mf394fl&host=&security=reality&fp=firefox&pbk=Sr4AUnriRCYqdPiQqZoJjn_MPLW7zoe3jMSUi4mKvB8&sni=yahoo.com&sid=e9013905&spx=%2Fm3f09f94fm%2C%3B#${inboundName}-${clientName}`;
    } catch (err) {
      console.error(err.message);
      throw new Error(err.message);
    }
  }

  public async charge(configName: string, trafficInGb: number): Promise<Database.RunResult> {
    try {
      const db = new BetterSqlite(SQLITE_FILE!, {fileMustExist: true});

      const inboundName = configName.split('-')[0] + '-' + configName.split('-')[1];
      const email = configName.split('-')[2];
      const trafficInBytes = trafficInGb * Math.pow(2, 30);

      const inbound = await this.findInbounds(inboundName);

      const settings = <Settings>JSON.parse(inbound.settings);
      const foundIdx = _.findIndex(settings.clients, {email: email});

      if (foundIdx === -1) {
        db.close();

        throw new Error('Charge Inbound: Not found');
      }

      settings.clients[foundIdx].totalGB =
        settings.clients[foundIdx].totalGB + trafficInGb * Math.pow(2, 30);

      const r = db
        .prepare(
          `UPDATE inbounds
          SET settings = ?
          WHERE id = ?`,
        )
        .run(JSON.stringify(settings, null, 2), inbound.id);
      console.log('updating', r);

      const r2 = db
        .prepare(
          `UPDATE client_traffics
          SET enable = 1, total = total + ?
          WHERE UPPER(email) = ?`,
        )
        .run(trafficInBytes, email.toUpperCase());

      console.log('updating, r2');

      db.close();

      if (r2.changes !== 0) {
        await this.restartXUI();
      }

      return r2;
    } catch (err) {
      console.error(err.message);
      throw new Error(err.message);
    }
  }

  public async findClient(name: string): Promise<ClientTraffics> {
    try {
      const db = new BetterSqlite(SQLITE_FILE!, {fileMustExist: true});

      const email = name.split('-')[2];
      console.log(name, email);
      const res = <ClientTraffics[]>(
        db.prepare(`SELECT * FROM client_traffics WHERE UPPER(email)=?`).all(email.toUpperCase())
      );

      db.close();

      if (res.length) {
        return res[0];
      }

      throw new Error('Find Client: not found');
    } catch (err) {
      throw new Error('Find Client: not found');
    }
  }

  public async findInbounds(name: string): Promise<Inbounds> {
    console.log(name);

    const db = new BetterSqlite(SQLITE_FILE!, {fileMustExist: true});

    const res = <Inbounds[]>(
      db.prepare(`SELECT * FROM inbounds WHERE UPPER(remark)=?`).all(name.toUpperCase())
    );

    db.close();

    if (res.length) {
      return res[0];
    }
    throw new Error('Find Inbound: not found');
  }

  public async deleteInbound(name: string): Promise<void> {
    const db = new BetterSqlite(SQLITE_FILE!, {fileMustExist: true});

    const res = db.prepare(`DELETE FROM inbounds WHERE UPPER(remark)=?`).run(name.toUpperCase());

    db.close();

    if (res.changes === 0) {
      throw new Error('Delete Inbound: not found');
    }

    await this.restartXUI();
  }

  public async restartXUI(ms?: number) {
    setTimeout(() => {
      exec('x-ui restart', (err: unknown, stdout: unknown, stderr: unknown) => {
        if (err) {
          console.error(err);
        } else {
          console.log(`stdout: ${stdout}`);
          console.log(`stderr: ${stderr}`);
        }
      });
    }, ms ?? 2000);
  }
}
