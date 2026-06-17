// ============================================
// TsuniForge — Shared Constants
// ============================================

// ─── Language Configurations ──────────────────

export const LANGUAGE_CONFIG = {
  cpp: {
    name: 'C++ 17',
    extension: '.cpp',
    compileCmd: 'g++ -std=c++17 -O2 -o solution solution.cpp',
    runCmd: './solution',
    monacoId: 'cpp',
    icon: '⚡',
  },
  java: {
    name: 'Java 17',
    extension: '.java',
    compileCmd: 'javac Solution.java',
    runCmd: 'java -Xmx256m Solution',
    monacoId: 'java',
    icon: '☕',
  },
  python: {
    name: 'Python 3.11',
    extension: '.py',
    compileCmd: null, // interpreted
    runCmd: 'python3 solution.py',
    monacoId: 'python',
    icon: '🐍',
  },
} as const;

// ─── Default Code Templates ──────────────────

export const CODE_TEMPLATES = {
  cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Your code here
    
    return 0;
}`,
  java: `import java.util.*;
import java.io.*;

public class Solution {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        
        // Your code here
        
        scanner.close();
    }
}`,
  python: `import sys
input = sys.stdin.readline

def solve():
    # Your code here
    pass

if __name__ == "__main__":
    solve()
`,
} as const;

// ─── Verdicts ─────────────────────────────────

export const VERDICT_DISPLAY = {
  PENDING: { label: 'Pending', color: '#94a3b8', icon: '⏳' },
  JUDGING: { label: 'Judging', color: '#f59e0b', icon: '⚙️' },
  AC: { label: 'Accepted', color: '#22c55e', icon: '✅' },
  WA: { label: 'Wrong Answer', color: '#ef4444', icon: '❌' },
  TLE: { label: 'Time Limit Exceeded', color: '#f97316', icon: '⏰' },
  MLE: { label: 'Memory Limit Exceeded', color: '#a855f7', icon: '💾' },
  RE: { label: 'Runtime Error', color: '#ec4899', icon: '💥' },
  CE: { label: 'Compilation Error', color: '#6366f1', icon: '🔧' },
} as const;

// ─── Difficulty ───────────────────────────────

export const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', color: '#22c55e', rating: [800, 1200] },
  medium: { label: 'Medium', color: '#f59e0b', rating: [1200, 1800] },
  hard: { label: 'Hard', color: '#ef4444', rating: [1800, 2800] },
} as const;

// ─── Problem Tags ─────────────────────────────

export const PROBLEM_TAGS = [
  'arrays',
  'strings',
  'hash-table',
  'dynamic-programming',
  'math',
  'sorting',
  'greedy',
  'binary-search',
  'dfs',
  'bfs',
  'trees',
  'graphs',
  'linked-list',
  'stack',
  'queue',
  'heap',
  'two-pointers',
  'sliding-window',
  'backtracking',
  'bit-manipulation',
  'divide-and-conquer',
  'union-find',
  'trie',
  'segment-tree',
  'topological-sort',
  'shortest-path',
  'number-theory',
  'geometry',
  'game-theory',
  'interactive',
] as const;

// ─── Execution Limits ─────────────────────────

export const EXECUTION_LIMITS = {
  DEFAULT_TIME_LIMIT_MS: 2000,
  DEFAULT_MEMORY_LIMIT_MB: 256,
  MAX_SOURCE_CODE_SIZE_KB: 64,
  MAX_OUTPUT_SIZE_KB: 256,
  MAX_PIDS: 64,
  WALL_CLOCK_MULTIPLIER: 2, // 2x the time limit
} as const;

// ─── Pagination ───────────────────────────────

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// ─── Rating ───────────────────────────────────

export const RATING_CONFIG = {
  INITIAL_RATING: 1200,
  K_FACTOR: 32,
  RATING_TIERS: [
    { name: 'Newbie', minRating: 0, maxRating: 1199, color: '#808080' },
    { name: 'Pupil', minRating: 1200, maxRating: 1399, color: '#22c55e' },
    { name: 'Specialist', minRating: 1400, maxRating: 1599, color: '#06b6d4' },
    { name: 'Expert', minRating: 1600, maxRating: 1899, color: '#3b82f6' },
    { name: 'Candidate Master', minRating: 1900, maxRating: 2099, color: '#a855f7' },
    { name: 'Master', minRating: 2100, maxRating: 2399, color: '#f59e0b' },
    { name: 'Grandmaster', minRating: 2400, maxRating: 2699, color: '#ef4444' },
    { name: 'Legendary Grandmaster', minRating: 2700, maxRating: Infinity, color: '#dc2626' },
  ],
} as const;
