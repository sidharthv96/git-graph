import { Entity, Column, PrimaryColumn, ManyToMany, BaseEntity } from 'typeorm';
import { Repo } from './Repo';

@Entity()
export class User extends BaseEntity {
  @PrimaryColumn()
  id: number;

  @Column()
  login: string;

  @ManyToMany((type) => Repo, (repo) => repo.stargazers)
  starredRepos: Repo[];
}
