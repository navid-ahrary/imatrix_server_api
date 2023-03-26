import {service} from '@loopback/core';
import {
  get,
  getModelSchemaRef,
  HttpErrors,
  param,
  post,
  requestBody,
} from '@loopback/rest';
import {Inbounds} from '../models';
import {SqliteService} from '../services';

export class ConfigsController {
  constructor(@service(SqliteService) private sqliteService: SqliteService) {}

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
    @param.query.string('remark', {required: true}) remark: string,
  ) {
    const inbound: Inbounds[] = await this.sqliteService.execute(
      'SELECT * FROM inbounds WHERE UPPER(remark) = ?',
      remark.toUpperCase(),
    );

    if (!inbound.length) {
      throw new HttpErrors.NotFound(`${remark} not found!`);
    } else if (inbound.length > 1) {
      throw new HttpErrors.UnprocessableEntity(`${remark} has multi result!`);
    }

    return new Inbounds(inbound[0]);
  }

  @post('/configs')
  async createConfigs(@requestBody(Inbounds) inbound: Inbounds) {}
}
