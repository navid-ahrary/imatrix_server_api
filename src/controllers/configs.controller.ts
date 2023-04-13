/* eslint-disable no-useless-catch */
import {intercept, service} from '@loopback/core';
import {get, getModelSchemaRef, HttpErrors, param, patch, post} from '@loopback/rest';
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
    @param.header.string('apikey') apikey: string,
    @param.query.string('configName', {required: true}) configName: string,
  ) {
    try {
      const inbound = await this.v2RayService.findInbound(configName);
      return inbound;
    } catch (err) {
      console.error(err.message);
      throw new HttpErrors.UnprocessableEntity(err.message);
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
              connectionString:
                'vless://1ec5fd9e-1f87-4502-af96-a87d7fbf0ddc@imatrix.store:2086?path=%2F&security=tls&encryption=none&type=ws#Probook-WS-XVZHE4US',
            },
          },
        },
      },
    },
  })
  async createConfigs(
    @param.header.string('apikey') apikey: string,
    @param.query.string('configName', {required: true}) configName: string,
    @param.query.number('trafficInGb', {required: true}) trafficInGb: number,
  ) {
    try {
      const connString = await this.v2RayService.generate('', configName, trafficInGb);

      return {
        connectionString: connString,
      };
    } catch (err) {
      console.error(err.message);
      throw new HttpErrors.UnprocessableEntity(err.message);
    }
  }

  @patch('/configs/', {
    responses: {
      204: {description: 'Done, no content'},
      404: {decscription: 'Config not found'},
    },
  })
  async chargeConfigs(
    @param.header.string('apikey') apikey: string,
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
}
