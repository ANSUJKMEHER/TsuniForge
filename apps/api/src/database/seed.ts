import { DataSource } from 'typeorm';
import { Problem, DifficultyEnum } from './entities/problem.entity';
import { TestCase } from './entities/test-case.entity';
import * as dotenv from 'dotenv';
dotenv.config();

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'tsuniforge',
  password: process.env.DB_PASSWORD || 'tsuniforge_secret',
  database: process.env.DB_DATABASE || 'tsuniforge',
  entities: [__dirname + '/entities/*.entity{.ts,.js}'],
  synchronize: false,
});

interface ProblemSeed {
  title: string;
  slug: string;
  difficulty: DifficultyEnum;
  tags: string[];
  descriptionMd: string;
  timeLimitMs: number;
  memoryLimitMb: number;
  testCases: Array<{
    input: string;
    expectedOutput: string;
    isSample: boolean;
    orderIndex: number;
    scoreWeight: number;
  }>;
}

const PROBLEMS: ProblemSeed[] = [
  {
    title: 'Two Sum',
    slug: 'two-sum',
    difficulty: DifficultyEnum.EASY,
    tags: ['array', 'hash-map'],
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    descriptionMd: `Given an array of integers nums and an integer target, return the indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

**Input Format:**
- First line: n (number of elements) and target
- Second line: n space-separated integers

**Output Format:**
- Two space-separated indices (0-indexed)

**Example:**
Input:
4 9
2 7 11 15

Output:
0 1

**Constraints:**
- 2 <= n <= 10^4
- -10^9 <= nums[i] <= 10^9`,
    testCases: [
      { input: '4 9\n2 7 11 15', expectedOutput: '0 1', isSample: true, orderIndex: 0, scoreWeight: 1 },
      { input: '3 6\n3 2 4', expectedOutput: '1 2', isSample: true, orderIndex: 1, scoreWeight: 1 },
      { input: '2 6\n3 3', expectedOutput: '0 1', isSample: false, orderIndex: 2, scoreWeight: 1 },
      { input: '5 10\n1 2 3 4 6', expectedOutput: '3 4', isSample: false, orderIndex: 3, scoreWeight: 1 },
      { input: '4 -1\n-3 4 3 90', expectedOutput: '0 2', isSample: false, orderIndex: 4, scoreWeight: 1 },
    ],
  },
  {
    title: 'Reverse String',
    slug: 'reverse-string',
    difficulty: DifficultyEnum.EASY,
    tags: ['string', 'two-pointers'],
    timeLimitMs: 1000,
    memoryLimitMb: 256,
    descriptionMd: `Write a function that reverses a string.

**Input Format:**
- A single line containing a string s

**Output Format:**
- The reversed string

**Constraints:**
- 1 <= s.length <= 10^5`,
    testCases: [
      { input: 'hello', expectedOutput: 'olleh', isSample: true, orderIndex: 0, scoreWeight: 1 },
      { input: 'Hannah', expectedOutput: 'hannaH', isSample: true, orderIndex: 1, scoreWeight: 1 },
      { input: 'a', expectedOutput: 'a', isSample: false, orderIndex: 2, scoreWeight: 1 },
      { input: 'abcdefghij', expectedOutput: 'jihgfedcba', isSample: false, orderIndex: 3, scoreWeight: 1 },
      { input: 'racecar', expectedOutput: 'racecar', isSample: false, orderIndex: 4, scoreWeight: 1 },
    ],
  },
  {
    title: 'Valid Parentheses',
    slug: 'valid-parentheses',
    difficulty: DifficultyEnum.EASY,
    tags: ['stack', 'string'],
    timeLimitMs: 1000,
    memoryLimitMb: 256,
    descriptionMd: `Given a string s containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.

Print "YES" if valid, "NO" otherwise.

**Constraints:**
- 0 <= s.length <= 10^4`,
    testCases: [
      { input: '()', expectedOutput: 'YES', isSample: true, orderIndex: 0, scoreWeight: 1 },
      { input: '()[]{}', expectedOutput: 'YES', isSample: true, orderIndex: 1, scoreWeight: 1 },
      { input: '(]', expectedOutput: 'NO', isSample: true, orderIndex: 2, scoreWeight: 1 },
      { input: '([)]', expectedOutput: 'NO', isSample: false, orderIndex: 3, scoreWeight: 1 },
      { input: '{[]}', expectedOutput: 'YES', isSample: false, orderIndex: 4, scoreWeight: 1 },
    ],
  },
  {
    title: 'Maximum Subarray',
    slug: 'maximum-subarray',
    difficulty: DifficultyEnum.MEDIUM,
    tags: ['array', 'dynamic-programming', 'divide-and-conquer'],
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    descriptionMd: `Given an integer array nums, find the subarray with the largest sum, and return its sum.

**Input Format:**
- First line: n (number of elements)
- Second line: n space-separated integers

**Output Format:**
- A single integer — the maximum subarray sum

**Constraints:**
- 1 <= n <= 10^5
- -10^4 <= nums[i] <= 10^4`,
    testCases: [
      { input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6', isSample: true, orderIndex: 0, scoreWeight: 1 },
      { input: '1\n1', expectedOutput: '1', isSample: true, orderIndex: 1, scoreWeight: 1 },
      { input: '5\n5 4 -1 7 8', expectedOutput: '23', isSample: true, orderIndex: 2, scoreWeight: 1 },
      { input: '3\n-1 -2 -3', expectedOutput: '-1', isSample: false, orderIndex: 3, scoreWeight: 1 },
      { input: '5\n1 2 3 4 5', expectedOutput: '15', isSample: false, orderIndex: 4, scoreWeight: 1 },
    ],
  },
  {
    title: 'Binary Search',
    slug: 'binary-search',
    difficulty: DifficultyEnum.EASY,
    tags: ['array', 'binary-search'],
    timeLimitMs: 1000,
    memoryLimitMb: 256,
    descriptionMd: `Given a sorted array of distinct integers and a target value, return the index if the target is found. If not, return -1.

**Input Format:**
- First line: n (number of elements) and target
- Second line: n sorted space-separated integers

**Output Format:**
- The index of the target, or -1 if not found

**Constraints:**
- 1 <= n <= 10^4
- nums is sorted in ascending order`,
    testCases: [
      { input: '6 9\n-1 0 3 5 9 12', expectedOutput: '4', isSample: true, orderIndex: 0, scoreWeight: 1 },
      { input: '6 2\n-1 0 3 5 9 12', expectedOutput: '-1', isSample: true, orderIndex: 1, scoreWeight: 1 },
      { input: '1 5\n5', expectedOutput: '0', isSample: false, orderIndex: 2, scoreWeight: 1 },
      { input: '3 1\n1 2 3', expectedOutput: '0', isSample: false, orderIndex: 3, scoreWeight: 1 },
      { input: '3 3\n1 2 3', expectedOutput: '2', isSample: false, orderIndex: 4, scoreWeight: 1 },
    ],
  },
  {
    title: 'Longest Common Subsequence',
    slug: 'longest-common-subsequence',
    difficulty: DifficultyEnum.MEDIUM,
    tags: ['string', 'dynamic-programming'],
    timeLimitMs: 2000,
    memoryLimitMb: 256,
    descriptionMd: `Given two strings text1 and text2, return the length of their longest common subsequence. If there is no common subsequence, return 0.

**Input Format:**
- First line: text1
- Second line: text2

**Output Format:**
- A single integer — the length of the LCS

**Constraints:**
- 1 <= text1.length, text2.length <= 1000`,
    testCases: [
      { input: 'abcde\nace', expectedOutput: '3', isSample: true, orderIndex: 0, scoreWeight: 1 },
      { input: 'abc\nabc', expectedOutput: '3', isSample: true, orderIndex: 1, scoreWeight: 1 },
      { input: 'abc\ndef', expectedOutput: '0', isSample: true, orderIndex: 2, scoreWeight: 1 },
      { input: 'bsbininm\njmjkbkjkv', expectedOutput: '1', isSample: false, orderIndex: 3, scoreWeight: 1 },
      { input: 'abcba\nabcbcba', expectedOutput: '5', isSample: false, orderIndex: 4, scoreWeight: 1 },
    ],
  },
  {
    title: 'Merge Sort',
    slug: 'merge-sort',
    difficulty: DifficultyEnum.MEDIUM,
    tags: ['sorting', 'divide-and-conquer', 'array'],
    timeLimitMs: 3000,
    memoryLimitMb: 256,
    descriptionMd: `Given an array of integers, sort the array and print the sorted array.

**Input Format:**
- First line: n (number of elements)
- Second line: n space-separated integers

**Output Format:**
- The sorted array as space-separated integers

**Constraints:**
- 1 <= n <= 5 * 10^4
- -5 * 10^4 <= nums[i] <= 5 * 10^4`,
    testCases: [
      { input: '5\n5 2 3 1 4', expectedOutput: '1 2 3 4 5', isSample: true, orderIndex: 0, scoreWeight: 1 },
      { input: '3\n3 2 1', expectedOutput: '1 2 3', isSample: true, orderIndex: 1, scoreWeight: 1 },
      { input: '1\n1', expectedOutput: '1', isSample: false, orderIndex: 2, scoreWeight: 1 },
      { input: '6\n-1 5 3 4 0 -2', expectedOutput: '-2 -1 0 3 4 5', isSample: false, orderIndex: 3, scoreWeight: 1 },
      { input: '4\n2 2 1 1', expectedOutput: '1 1 2 2', isSample: false, orderIndex: 4, scoreWeight: 1 },
    ],
  },
  {
    title: 'Graph BFS Shortest Path',
    slug: 'graph-bfs-shortest-path',
    difficulty: DifficultyEnum.HARD,
    tags: ['graph', 'bfs', 'shortest-path'],
    timeLimitMs: 3000,
    memoryLimitMb: 256,
    descriptionMd: `Given an unweighted undirected graph with n nodes and m edges, find the shortest path (number of edges) from node 1 to node n. If no path exists, print -1.

**Input Format:**
- First line: n m (number of nodes, number of edges)
- Next m lines: u v (an edge between nodes u and v)

**Output Format:**
- The shortest path length, or -1 if unreachable

**Constraints:**
- 2 <= n <= 10^5
- 1 <= m <= 2 * 10^5`,
    testCases: [
      { input: '4 4\n1 2\n2 3\n3 4\n1 3', expectedOutput: '2', isSample: true, orderIndex: 0, scoreWeight: 1 },
      { input: '3 1\n1 2', expectedOutput: '-1', isSample: true, orderIndex: 1, scoreWeight: 1 },
      { input: '2 1\n1 2', expectedOutput: '1', isSample: false, orderIndex: 2, scoreWeight: 1 },
      { input: '5 5\n1 2\n2 3\n3 4\n4 5\n1 5', expectedOutput: '1', isSample: false, orderIndex: 3, scoreWeight: 1 },
      { input: '3 3\n1 2\n2 3\n1 3', expectedOutput: '1', isSample: false, orderIndex: 4, scoreWeight: 1 },
    ],
  },
];

async function seed() {
  console.log('Connecting to database...');
  await dataSource.initialize();
  await dataSource.synchronize();

  const userRepo = dataSource.getRepository('User');
  const problemRepo = dataSource.getRepository('Problem');
  const testCaseRepo = dataSource.getRepository('TestCase');

  // Create a system user to own the problems
  let systemUser = await userRepo.findOne({ where: { email: 'system@tsuniforge.com' } });
  if (!systemUser) {
    console.log('Creating system user...');
    systemUser = userRepo.create({
      username: 'System',
      email: 'system@tsuniforge.com',
      passwordHash: 'not_a_real_password',
      rating: 4000,
      title: 'System Admin',
    });
    systemUser = await userRepo.save(systemUser);
  }

  for (const p of PROBLEMS) {
    const existing = await problemRepo.findOne({ where: { slug: p.slug } });
    if (existing) {
      console.log(`  Skip: "${p.title}" already exists`);
      continue;
    }

    const problem = problemRepo.create({
      title: p.title,
      slug: p.slug,
      difficulty: p.difficulty,
      tags: p.tags,
      descriptionMd: p.descriptionMd,
      timeLimitMs: p.timeLimitMs,
      memoryLimitMb: p.memoryLimitMb,
      isPublished: true,
      acceptanceRate: Math.floor(Math.random() * 30) + 40,
      totalSubmissions: Math.floor(Math.random() * 500) + 100,
      createdBy: systemUser.id,
    });

    const savedProblem = await problemRepo.save(problem);

    const testCases = p.testCases.map((tc) =>
      testCaseRepo.create({
        problemId: savedProblem.id,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        isSample: tc.isSample,
        orderIndex: tc.orderIndex,
        scoreWeight: tc.scoreWeight,
      }),
    );

    await testCaseRepo.save(testCases);
    console.log(`  Seeded "${p.title}" with ${testCases.length} test cases`);
  }

  console.log('\nSeeding complete!');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
