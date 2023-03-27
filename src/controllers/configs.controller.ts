/* eslint-disable no-useless-catch */
import {intercept, service} from '@loopback/core';
import {get, getModelSchemaRef, HttpErrors, param, patch, post, requestBody} from '@loopback/rest';
import {AuthenticatorInterceptor} from '../interceptors';
import {Inbounds} from '../models';
import {V2RayService} from '../services';

enum Protocol {
  'VLESS_WS' = 'vless-ws',
}

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
  async findConfigs(@param.query.string('configName', {required: true}) configName: string) {
    const inbound: Inbounds[] = await this.v2RayService.execute(
      'SELECT * FROM inbounds WHERE UPPER(remark) = ?',
      configName.toUpperCase(),
    );

    if (!inbound.length) {
      throw new HttpErrors.NotFound(`${configName} not found!`);
    } else if (inbound.length > 1) {
      throw new HttpErrors.UnprocessableEntity(`${configName} has multi result!`);
    }

    return new Inbounds(inbound[0]);
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
    @param.query.string('protocol', {required: true, schema: {enum: Object.values(Protocol)}})
    protocol: Protocol,
    @param.query.number('trafficInGb', {required: true}) trafficInGb: number,
  ) {
    try {
      let connString: string;

      if (protocol === Protocol.VLESS_WS) {
        connString = await this.v2RayService.generateVlessWS(trafficInGb);
      } else {
        throw new Error(`Protocol ${protocol} not supported!`);
      }

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
    @param.query.string('configName', {required: true}) configName: string,
    @requestBody({
      description: 'How much traffic?',
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            properties: {
              trafficInGb: {
                type: 'number',
              },
            },
          },
          example: {trafficInGb: 30},
        },
      },
    })
    reqBody: {trafficInGb: number},
  ) {
    try {
      const result = await this.v2RayService.charge(configName, reqBody.trafficInGb);

      if (result.changes === 0) {
        throw new HttpErrors.NotFound(`404: "${configName}" not found!`);
      }
    } catch (err) {
      console.error(err.message);
      throw err;
    }
  }
}
