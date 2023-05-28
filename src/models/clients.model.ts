import {Model, model, property} from '@loopback/repository';

@model()
export class Clients extends Model {
  @property({
    type: 'string',
    id: true,
    generated: false,
    required: true,
  })
  id: string;

  @property({
    type: 'string',
    required: true,
  })
  flow: string;

  @property({
    type: 'string',
    required: true,
  })
  email: string;

  @property({
    type: 'number',
    required: true,
  })
  limitIp: number;

  @property({
    type: 'number',
    required: true,
  })
  totalGB: number;

  @property({
    type: 'number',
    required: true,
  })
  expiryTime: number;

  @property({
    type: 'boolean',
    required: true,
  })
  enable: boolean;

  @property({
    type: 'string',
    required: true,
  })
  tgId: string;

  @property({
    type: 'string',
    required: true,
  })
  subId: string;

  constructor(data?: Partial<Clients>) {
    super(data);
  }
}
