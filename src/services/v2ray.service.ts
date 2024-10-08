/* eslint-disable no-useless-catch */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {BindingScope, injectable} from '@loopback/core';
import Database, {default as BetterSqlite} from 'better-sqlite3';
import {exec} from 'child_process';
import _ from 'lodash';
import {v4 as uuidV4} from 'uuid';
import {ClientTraffics, Clients, Inbounds} from '../models';

const {TUNNEL_DOMAIN, TUNNEL_PORTS, SQLITE_FILE, SERVER_NAME} = process.env;

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
      const port = JSON.parse(TUNNEL_PORTS!)[
        Math.floor(Math.random() * JSON.parse(TUNNEL_PORTS!).length)
      ];
      const inboundName = `${SERVER_NAME}-TCP`;
      const inbound = await this.findInbounds(inboundName);
      const traffic = Math.ceil(trafficInGb * Math.pow(2, 30));

      const settings = <Settings>JSON.parse(inbound.settings);

      const client = new Clients({
        email: clientName,
        enable: true,
        expiryTime: 0,
        flow: 'xtls-rprx-vision',
        id: clientId,
        limitIp: 0,
        subId: '',
        tgId: '',
        totalGB: traffic,
      });

      settings.clients.push(client);

      const r = db
        .prepare(`UPDATE inbounds SET settings = ? WHERE id = ?`)
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

      return `vless://${clientId}@${TUNNEL_DOMAIN}:${port}?type=tcp&security=reality&fp=firefox&pbk=j6bS51haRH7KZMqHn69MHxv0qIBsx7oXZQfbHUBC-2k&sni=yimg.com&flow=xtls-rprx-vision&sid=17dcf3c9&spx=%2Fv48nv3uio4#${inboundName}-${clientName}`;
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
