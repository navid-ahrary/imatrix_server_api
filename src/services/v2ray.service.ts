/* eslint-disable @typescript-eslint/no-explicit-any */
import {BindingScope, injectable} from '@loopback/core';
import {default as BetterSqlite, default as Database} from 'better-sqlite3';
import {exec} from 'child_process';
import {v4 as uuidV4} from 'uuid';
import {Clients, Inbounds} from '../models';

const {DOMAIN, SQLITE_FILE} = process.env;

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

  public async generate(
    configName: string,
    clientName: string,
    trafficInGb: number,
  ): Promise<string> {
    try {
      const clientId = uuidV4();

      console.log(`Generating ${clientName} ...`);

      const inbound = await this.findInbound(configName);

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

      return `vless://${clientId}@dorna.imatrix.store:443?type=grpc&serviceName=&security=tls&fp=chrome&alpn=h2%2Chttp%2F1.1&sni=${DOMAIN}#Dorna-gRPC-${clientName}`;
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

  public async findInbound(name: string): Promise<Inbounds> {
    const res = <Inbounds[]>(
      this.db.prepare(`SELECT * FROM inbounds WHERE UPPER(name) = ?`).all(name.toUpperCase())
    );
    if (res.length) {
      return res[0];
    }
    throw new Error('InboundId not found');
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
