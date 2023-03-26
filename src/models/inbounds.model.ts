/* eslint-disable @typescript-eslint/naming-convention */
import {Entity, model, property} from '@loopback/repository';

@model()
export class Inbounds extends Entity {
  @property({
    type: 'number',
    id: true,
    generated: true,
  })
  id?: number;

  @property({
    type: 'number',
    required: true,
  })
  user_id: number;

  @property({
    type: 'number',
    required: true,
  })
  up: number;

  @property({
    type: 'number',
    required: true,
  })
  down: number;

  @property({
    type: 'number',
    required: true,
  })
  total: number;

  @property({
    type: 'string',
    required: true,
  })
  remark: string;

  @property({
    type: 'boolean',
    required: true,
  })
  enable: boolean;

  @property({
    type: 'number',
    required: true,
  })
  expiry_time: number;

  @property({
    type: 'string',
    required: true,
  })
  listen: string;

  @property({
    type: 'number',
    required: true,
  })
  port: number;

  @property({
    type: 'string',
    required: true,
  })
  protocol: string;

  @property({
    type: 'string',
    required: true,
  })
  settings: string;

  @property({
    type: 'string',
    required: true,
  })
  stream_settings: string;

  @property({
    type: 'string',
    required: true,
  })
  tag: string;

  @property({
    type: 'string',
    required: true,
  })
  sniffing: string;

  constructor(data?: Partial<Inbounds>) {
    super(data);
  }
}
