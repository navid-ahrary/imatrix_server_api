/* eslint-disable @typescript-eslint/no-explicit-any */
import {BindingScope, injectable} from '@loopback/core';
import {default as BetterSqlite, default as Database} from 'better-sqlite3';
import {exec} from 'child_process';
import os from 'os';
import {v4 as uuidV4} from 'uuid';

const {DOMAIN, SQLITE_FILE, PORT_RANGE} = process.env;

@injectable({scope: BindingScope.SINGLETON})
export class V2RayService {
  private db: BetterSqlite.Database;

  private START_PORT = +PORT_RANGE!.split(':')[0];
  private END_PORT = +PORT_RANGE!.split(':')[1];

  constructor() {
    this.db = new BetterSqlite(SQLITE_FILE!, {fileMustExist: true});
    this.db.pragma('journal_mode = WAL');
  }

  public async execute(query: string, ...params: any[]): Promise<any[]> {
    return this.db.prepare(query).all(params);
  }

  public async generateVlessWS(trafficInGb: number): Promise<string> {
    try {
      const HOSTNAME = os.hostname();
      const configName = `${HOSTNAME}-WS-${this.generateRandomString(8)}`;
      const id = uuidV4();
      const port = await this.findIdlePort();
      const tag = `inbound-${port}`;
      const trafficInBytes = trafficInGb * Math.pow(2, 30);

      console.log(`Generating ${configName}:${port} ...`);

      const settings = {
        clients: [
          {
            id: id,
            flow: 'xtls-rprx-direct',
          },
        ],
        decryption: 'none',
        fallbacks: [],
      };
      const streamSettings = {
        network: 'ws',
        security: 'tls',
        tlsSettings: {
          serverName: '',
          certificates: [
            {
              certificateFile: '/etc/v2ray/v2ray.crt',
              keyFile: '/etc/v2ray/v2ray.key',
            },
          ],
        },
        wsSettings: {
          path: '/',
          headers: {},
        },
      };
      const sniffing = {
        enabled: true,
        destOverride: ['http', 'tls'],
      };

      this.db
        .prepare(
          `INSERT INTO inbounds
          (user_id,up,down,total,remark,enable,expiry_time,port,protocol,listen,settings,stream_settings,tag,sniffing)
          VALUES (1,0,0,?,?,1,0,?,'vless','',?,?,?,?)`,
        )
        .run(
          trafficInBytes,
          configName,
          port,
          JSON.stringify(settings, null, 2),
          JSON.stringify(streamSettings, null, 2),
          tag,
          JSON.stringify(sniffing, null, 2),
        );

      await this.restartXUI();

      return `vless://${id}@${DOMAIN}:${port}?path=%2F&security=tls&encryption=none&type=ws#${configName}`;
    } catch (err) {
      console.error(err.message);
      throw new Error(err.message);
    }
  }

  public async charge(configName: string, trafficInGb: number): Promise<Database.RunResult> {
    try {
      const trafficInBytes = trafficInGb * Math.pow(2, 30);

      const r = this.db
        .prepare(
          `UPDATE inbounds
          SET enable = 1, total = total + ?
          WHERE UPPER(remark) = ?`,
        )
        .run(trafficInBytes, configName.toUpperCase());

      if (r.changes !== 0) {
        await this.restartXUI();
      }

      return r;
    } catch (err) {
      console.error(err.message);
      throw new Error(err.message);
    }
  }

  public async findIdlePort(): Promise<number> {
    const e: any[] = this.db
      .prepare(
        `SELECT DISTINCT port-1 AS previous_port
          FROM inbounds
          WHERE previous_port NOT IN (SELECT DISTINCT port FROM inbounds)
          AND previous_port > 0
          AND previous_port BETWEEN ? AND ?
          LIMIT 1`,
      )
      .all(this.START_PORT, this.END_PORT);

    if (e.length) {
      const port = e[0]['previous_port'];

      if (port > this.END_PORT) throw new Error('PORT FULLED');

      return port;
    } else {
      const e2: any[] = this.db
        .prepare(
          `SELECT port FROM inbounds
          WHERE port BETWEEN ? AND ? ORDER BY PORT DESC LIMIT 1`,
        )
        .all(this.START_PORT, this.END_PORT);

      if (e2.length) {
        const port = e2[0]['port'] + 1;

        if (port > this.END_PORT) throw new Error('PORT FULLED');

        return port;
      } else {
        return this.START_PORT;
      }
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

  private generateRandomString(length: number) {
    let result = '';
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }
}
