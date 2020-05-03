import {
  Entity,
  PrimaryColumn,
  ManyToMany,
  JoinTable,
  BaseEntity,
  Column,
} from 'typeorm';
import { User } from './User';

@Entity()
export class Repo extends BaseEntity {
  @PrimaryColumn()
  id: number;

  @Column()
  full_name: string;

  @Column()
  name: string;

  @Column()
  owner: string;

  @Column()
  private: boolean;

  @Column()
  stargazers_count: number;

  @ManyToMany((type) => User, (user) => user.starredRepos, {
    cascade: true,
  })
  @JoinTable()
  stargazers: User[];
}
