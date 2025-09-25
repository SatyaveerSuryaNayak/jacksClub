export abstract class BaseModel {
  public id: string;

  constructor(id: string) {
    this.id = id;
  }
}

export interface BaseModel{
id: string,
createdAt: number,
udpatedAt: number}

