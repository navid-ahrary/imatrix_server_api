/* eslint-disable no-useless-catch */
/* eslint-disable @typescript-eslint/no-explicit-any */
import {BindingScope, injectable} from '@loopback/core';
import {default as BetterSqlite, default as Database} from 'better-sqlite3';
import {exec} from 'child_process';
import {v4 as uuidV4} from 'uuid';
import {ClientTraffics, Clients, Inbounds} from '../models';

const {TUNNEL_DOMAIN, TUNNEL_PORT, SQLITE_FILE} = process.env;

interface Settings {
  clients: Clients[];
  decryption: string;
  fallbacks: [];
}

@injectable({scope: BindingScope.SINGLETON})
export class V2RayService {
  private db: BetterSqlite.Database;

  constructor() {
    this.db = new BetterSqlite(SQLITE_FILE!, {fileMustExist: true});
    this.db.pragma('journal_mode = WAL');
  }

  public async generate(clientName: string, trafficInGb: number): Promise<string> {
    try {
      const clientId = uuidV4();

      console.log(`Generating ${clientName} ...`);

      const inboundName = 'Sahel-RE';
      const inbound = await this.findInbounds(inboundName);

      const settings = <Settings>JSON.parse(inbound.settings);

      settings.clients.push(
        new Clients({
          id: clientId,
          email: clientName,
          totalGB: trafficInGb,
          enable: true,
          expiryTime: 0,
          flow: '',
          limitIp: 0,
          subId: '',
          tgId: '',
        }),
      );

      inbound.settings = JSON.stringify(settings, null, 2);

      console.log(settings);
      console.log(inbound);

      // this.db
      //   .prepare(
      //     `INSERT INTO client_traffics
      //     (inbound_id, enable, email, up, down, expiry_time, total)
      //     VALUES (?, 1, ?, 0, 0, 0, ?)`,
      //   )
      //   .run(inboundId, configName, trafficInBytes);

      await this.restartXUI();

      return `vless://${clientId}@${TUNNEL_DOMAIN}:${TUNNEL_PORT}?type=grpc&serviceName=&security=reality&fp=firefox&pbk=6EwNceeX1hkid4hHwIzt0dX4JirL93oFaN9ioVo_nTk&sni=yahoo.com&sid=7f46a381#Sahel-RE-Younes`;
    } catch (err) {
      console.error(err.message);
      throw new Error(err.message);
    }
  }

  public async charge(email: string, trafficInGb: number): Promise<Database.RunResult> {
    try {
      const trafficInBytes = trafficInGb * Math.pow(2, 30);

      const r = this.db
        .prepare(
          `UPDATE client_traffics
          SET enable = 1, total = total + ?
          WHERE UPPER(email) = ?`,
        )
        .run(trafficInBytes, email.toUpperCase());

      if (r.changes !== 0) {
        await this.restartXUI();
      }

      return r;
    } catch (err) {
      console.error(err.message);
      throw new Error(err.message);
    }
  }

  public async findClient(name: string): Promise<ClientTraffics> {
    try {
      const email = name.split('-')[2];
      const res = <ClientTraffics[]>(
        this.db
          .prepare(`SELECT * FROM client_traffics WHERE UPPER(email)=?`)
          .all(email.toUpperCase())
      );
      if (res.length) {
        return res[0];
      }
      throw new Error('Find Client: not found');
    } catch (err) {
      throw new Error('Find Client: not found');
    }
  }

  public async findInbounds(name: string): Promise<Inbounds> {
    const res = <Inbounds[]>(
      this.db.prepare(`SELECT * FROM inbounds WHERE UPPER(remark)=?`).all(name.toUpperCase())
    );
    if (res.length) {
      return res[0];
    }
    throw new Error('Find Inbound: not found');
  }

  public async deleteInbound(name: string): Promise<void> {
    const res = this.db
      .prepare(`DELETE FROM inbounds WHERE UPPER(remark)=?`)
      .run(name.toUpperCase());

    if (res.changes === 0) {
      throw new Error('Delete Inbound: not found');
    }
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
