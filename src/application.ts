import dotenv from 'dotenv';
dotenv.config();

import {BootMixin} from '@loopback/boot';
import {ApplicationConfig} from '@loopback/core';
import {RepositoryMixin} from '@loopback/repository';
import {RestApplication} from '@loopback/rest';
import {RestExplorerBindings, RestExplorerComponent} from '@loopback/rest-explorer';
import {ServiceMixin} from '@loopback/service-proxy';
import path from 'path';
import {MySequence} from './sequence';

export {ApplicationConfig};

export class ImatrixServerApiApplication extends BootMixin(
  ServiceMixin(RepositoryMixin(RestApplication)),
) {
  constructor(options: ApplicationConfig = {}) {
    super(options);

    this.verifyEnvVars();

    // Set up the custom sequence
    this.sequence(MySequence);

    // Set up default home page
    this.static('/', path.join(__dirname, '../public'));

    // Customize @loopback/rest-explorer configuration here
    this.configure(RestExplorerBindings.COMPONENT).to({
      path: '/explorer',
    });
    this.component(RestExplorerComponent);

    this.projectRoot = __dirname;
    // Customize @loopback/boot Booter Conventions here
    this.bootOptions = {
      controllers: {
        // Customize ControllerBooter Conventions here
        dirs: ['controllers'],
        extensions: ['.controller.js'],
        nested: true,
      },
    };
  }

  verifyEnvVars() {
    const {API_KEY, TUNNEL_DOMAIN, TUNNEL_PORT, SQLITE_FILE} = process.env;

    const errs = [];

    if (!API_KEY) errs.push('API_KEY');
    if (!TUNNEL_DOMAIN) errs.push('TUNNEL_DOMAIN');
    if (!TUNNEL_PORT) errs.push('TUNNEL_PORT');
    if (!SQLITE_FILE) errs.push('SQLITE_FILE');

    if (errs.length) throw new Error(`${errs.join(', ')} must be provided!`);
  }
}
