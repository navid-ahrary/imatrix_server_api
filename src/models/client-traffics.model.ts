import {Entity, model, property} from '@loopback/repository';

@model()
export class ClientTraffics extends Entity {
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
  inbound_id: number;

  @property({
    type: 'boolean',
    required: true,
  })
  enable: boolean;

  @property({
    type: 'string',
    required: true,
  })
  email: string;

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
  expiry_time: number;

  @property({
    type: 'number',
    required: true,
  })
  total: number;


  constructor(data?: Partial<ClientTraffics>) {
    super(data);
  }
}

export interface ClientTrafficsRelations {
  // describe navigational properties here
}

export type ClientTrafficsWithRelations = ClientTraffics & ClientTrafficsRelations;
