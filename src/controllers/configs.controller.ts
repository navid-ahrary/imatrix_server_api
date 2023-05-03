/* eslint-disable no-useless-catch */
import {intercept, service} from '@loopback/core';
import {HttpErrors, del, get, getModelSchemaRef, param, patch, post} from '@loopback/rest';
import {AuthenticatorInterceptor} from '../interceptors';
import {Inbounds} from '../models';
import {V2RayService} from '../services';

@intercept(AuthenticatorInterceptor.BINDING_KEY)
export class ConfigsController {
  constructor(@service(V2RayService) private v2RayService: V2RayService) {}

  @get('/configs', {
    responses: {
      200: {
        content: {
          'application/json': {
            schema: getModelSchemaRef(Inbounds),
          },
        },
      },
    },
  })
  async findConfigs(
    @param.header.string('apikey', {example: 'apikey'}) apikey: string,
    @param.query.string('configName', {required: true}) configName: string,
  ) {
    try {
      const client = await this.v2RayService.findClient(configName);
      return client;
    } catch (err) {
      console.error(err.message);

      try {
        //  Check for old x-ui panels
        if (err.message === 'Client not found') {
          const inbound = await this.v2RayService.findInbounds(configName);
          return inbound;
        }
      } catch (err2) {
        console.error(err2.message);
        throw new HttpErrors.UnprocessableEntity(err2.message);
      }
    }
  }

  @post('/configs', {
    responses: {
      200: {
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                connectionString: {type: 'string'},
              },
            },
            example: {
              connectionString: 'vless://...',
            },
          },
        },
      },
    },
  })
  async createConfigs(
    @param.header.string('apikey', {example: 'apikey', required: true}) apikey: string,
    @param.query.string('configName', {required: true}) configName: string,
    @param.query.number('trafficInGb', {required: true}) trafficInGb: number,
  ) {
    try {
      const connString = await this.v2RayService.generate(configName, trafficInGb);

      return {
        connectionString: connString,
      };
    } catch (err) {
      console.error(err.message);
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }

  @patch('/configs', {
    responses: {
      204: {description: 'Done, no content'},
      404: {decscription: 'Config not found'},
    },
  })
  async chargeConfigs(
    @param.header.string('apikey', {example: 'apikey', required: true}) apikey: string,
    @param.query.string('configName', {required: true}) configName: string,
    @param.query.number('trafficInGb', {required: true}) trafficInGb: number,
  ) {
    try {
      const result = await this.v2RayService.charge(configName, trafficInGb);

      if (result.changes === 0) {
        throw new HttpErrors.NotFound(`404: "${configName}" not found!`);
      }
    } catch (err) {
      console.error(err.message);
      throw err;
    }
  }

  @del('/configs', {
    responses: {
      204: {description: 'Done, no content'},
      404: {description: 'Config not found'},
    },
  })
  async deleteConfig(
    @param.header.string('apikey', {example: 'apikey', required: true}) apikey: string,
    @param.query.string('configName', {required: true}) configName: string,
  ) {
    try {
      await this.v2RayService.deleteInbound(configName);
    } catch (err) {
      console.error(err.message);
      throw err;
    }
  }
}
