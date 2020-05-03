import { Octokit } from '@octokit/rest';
import { retry } from '@octokit/plugin-retry';
import { createConnection, getConnection } from 'typeorm';
import { User } from './entity/User';
import { Repo } from './entity/Repo';
import { Cached } from './decorator';

const MyOctokit = Octokit.plugin(retry);

const octokit = new MyOctokit({
  // log: console,
  auth: process.env['GITHUB_AUTH_TOKEN'],
  userAgent: 'git-graph v1.2.3',
});

class Util {
  @Cached()
  public static async getStarredRepos(): Promise<Repo[]> {
    const starredRepos = await octokit.activity.listReposStarredByAuthenticatedUser(
      {
        per_page: 100,
      }
    );
    return (starredRepos.data as unknown) as Repo[];
  }

  @Cached()
  public static async fetchStarGazers(
    owner: string,
    repo: string
  ): Promise<User[]> {
    const result = ((await octokit.paginate(
      octokit.activity.listStargazersForRepo,
      {
        owner,
        repo,
        per_page: 100,
      }
    )) as unknown) as any[];
    const users: User[] = result.map((r) => {
      return {
        id: r.id,
        login: r.login,
      } as User;
    });
    return users;
  }
}

async function run() {
  await createConnection();

  const starredRepos: Repo[] = await Util.getStarredRepos();
  starredRepos.sort((x, y) => x.stargazers_count - y.stargazers_count);

  const userMap: Map<number, { count: number; repos: Repo[] }> = new Map();

  for (const repo of starredRepos) {
    await addRepo(repo);
    const gazers = await getStarGazers(repo.id);
    for (const gazer of gazers) {
      const val = userMap.get(gazer.id) || {
        count: 0,
        repos: [],
      };
      val.count += 1;
      val.repos.push(repo);
      userMap.set(gazer.id, val);
    }
  }
}

run();

async function addRepo(repo: Repo) {
  console.log(`Adding repo : ${repo.full_name}`);
  const r = new Repo();
  r.full_name = repo.full_name;
  [r.owner, r.name] = repo.full_name.split('/');
  r.id = repo.id;
  r.private = repo.private;
  r.stargazers_count = repo.stargazers_count;
  await r.save();
}

async function getStarGazers(id: number): Promise<User[]> {
  console.log('getStarGazers');
  const repo = await Repo.findOneOrFail(id, {
    relations: ['stargazers'],
  });
  if (repo.stargazers === undefined || repo.stargazers.length === 0) {
    const gazers: User[] = await Util.fetchStarGazers(repo.owner, repo.name);
    console.log('Adding users');
    const ids = gazers.map((g) => g.id);
    const existing = (await User.findByIds(ids)).map((u) => u.id);
    if (existing.length !== ids.length) {
      await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values(gazers.filter((g) => !existing.includes(g.id)))
        .execute();
    }
    console.log('Users added');
    console.log('Saving Repo');
    await getConnection()
      .createQueryBuilder()
      .relation(Repo, 'stargazers')
      .of(repo.id)
      .add(gazers.map((g) => g.id));
    console.log('Repo Saved');
  } else {
    console.log(repo.stargazers);
  }
  return repo.stargazers;
}

async function addStarGazer(user: User, repo: Repo) {
  console.log(`Adding stargazer : ${user.login} to Repo : ${repo.full_name}`);
  const u = await addUser(user);
  if (repo.stargazers === undefined || repo.stargazers.length === 0) {
    repo.stargazers = [];
  }
  repo.stargazers.push(u);
}

async function addUser(user: User) {
  console.log(`Adding user : ${user.login}`);
  const u = new User();
  u.id = user.id;
  u.login = user.login;
  await u.save();
  return u;
}
